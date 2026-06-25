import { Router } from "express";

import { authenticateJwt, type AuthenticatedRequest } from "../auth/middleware";
import { roles } from "../auth/roles";
import type { TimesheetRecord, TimesheetStore } from "./types";
import { validateCreateTimesheet, validateUpdateTimesheet } from "./validation";

function isReviewer(request: AuthenticatedRequest): boolean {
  return request.user?.role === roles.admin || request.user?.role === roles.projectManager;
}

function isFieldUser(request: AuthenticatedRequest): boolean {
  return request.user?.role === roles.fieldUser;
}

function canReadTimesheet(request: AuthenticatedRequest, timesheet: TimesheetRecord): boolean {
  return isReviewer(request) || request.user?.id === timesheet.submittedByUserId;
}

function ensureAuthenticatedUser(request: AuthenticatedRequest): string {
  if (!request.user) {
    throw new Error("Authenticated user missing after auth middleware.");
  }

  return request.user.id;
}

export function createTimesheetsRouter(timesheetStore: TimesheetStore): Router {
  const router = Router();

  router.use(authenticateJwt);

  router.get("/", async (request: AuthenticatedRequest, response, next) => {
    try {
      const filter = isReviewer(request) ? undefined : { submittedByUserId: ensureAuthenticatedUser(request) };
      const timesheets = await timesheetStore.list(filter);

      response.status(200).json({ timesheets });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (request: AuthenticatedRequest, response, next) => {
    try {
      const timesheet = await timesheetStore.findById(request.params.id);

      if (!timesheet) {
        response.status(404).json({ error: "Timesheet not found" });
        return;
      }

      if (!canReadTimesheet(request, timesheet)) {
        response.status(403).json({ error: "Forbidden" });
        return;
      }

      response.status(200).json({ timesheet });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (request: AuthenticatedRequest, response, next) => {
    if (!isFieldUser(request)) {
      response.status(403).json({ error: "Forbidden" });
      return;
    }

    const validation = validateCreateTimesheet(request.body, ensureAuthenticatedUser(request));

    if (!validation.value) {
      response.status(400).json({ error: "Validation failed", errors: validation.errors });
      return;
    }

    try {
      const timesheet = await timesheetStore.create(validation.value);

      response.status(201).json({ timesheet });
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", async (request: AuthenticatedRequest, response, next) => {
    if (!isFieldUser(request)) {
      response.status(403).json({ error: "Forbidden" });
      return;
    }

    const validation = validateUpdateTimesheet(request.body);

    if (!validation.value) {
      response.status(400).json({ error: "Validation failed", errors: validation.errors });
      return;
    }

    try {
      const existing = await timesheetStore.findById(request.params.id);

      if (!existing) {
        response.status(404).json({ error: "Timesheet not found" });
        return;
      }

      if (existing.submittedByUserId !== ensureAuthenticatedUser(request)) {
        response.status(403).json({ error: "Forbidden" });
        return;
      }

      if (existing.status !== "draft") {
        response.status(409).json({ error: "Only draft timesheets can be edited" });
        return;
      }

      const timesheet = await timesheetStore.update(request.params.id, validation.value);

      response.status(200).json({ timesheet });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/submit", async (request: AuthenticatedRequest, response, next) => {
    if (!isFieldUser(request)) {
      response.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const existing = await timesheetStore.findById(request.params.id);

      if (!existing) {
        response.status(404).json({ error: "Timesheet not found" });
        return;
      }

      if (existing.submittedByUserId !== ensureAuthenticatedUser(request)) {
        response.status(403).json({ error: "Forbidden" });
        return;
      }

      if (existing.status !== "draft") {
        response.status(409).json({ error: "Only draft timesheets can be submitted" });
        return;
      }

      const timesheet = await timesheetStore.submit(request.params.id);

      response.status(200).json({ timesheet });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/approve", async (request: AuthenticatedRequest, response, next) => {
    if (!isReviewer(request)) {
      response.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const existing = await timesheetStore.findById(request.params.id);

      if (!existing) {
        response.status(404).json({ error: "Timesheet not found" });
        return;
      }

      if (existing.status !== "submitted") {
        response.status(409).json({ error: "Only submitted timesheets can be approved" });
        return;
      }

      const timesheet = await timesheetStore.approve(request.params.id, ensureAuthenticatedUser(request));

      response.status(200).json({ timesheet });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/reject", async (request: AuthenticatedRequest, response, next) => {
    if (!isReviewer(request)) {
      response.status(403).json({ error: "Forbidden" });
      return;
    }

    try {
      const existing = await timesheetStore.findById(request.params.id);

      if (!existing) {
        response.status(404).json({ error: "Timesheet not found" });
        return;
      }

      if (existing.status !== "submitted") {
        response.status(409).json({ error: "Only submitted timesheets can be rejected" });
        return;
      }

      const timesheet = await timesheetStore.reject(request.params.id);

      response.status(200).json({ timesheet });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
