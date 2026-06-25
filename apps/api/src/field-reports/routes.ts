import { Router } from "express";

import { authenticateJwt, type AuthenticatedRequest } from "../auth/middleware";
import { roles } from "../auth/roles";
import type { FieldReportRecord, FieldReportStore } from "./types";
import { validateCreateFieldReport, validateUpdateFieldReport } from "./validation";

function isReviewer(request: AuthenticatedRequest): boolean {
  return request.user?.role === roles.admin || request.user?.role === roles.projectManager;
}

function isFieldUser(request: AuthenticatedRequest): boolean {
  return request.user?.role === roles.fieldUser;
}

function canReadReport(request: AuthenticatedRequest, report: FieldReportRecord): boolean {
  return isReviewer(request) || request.user?.id === report.authorUserId;
}

function ensureAuthenticatedUser(request: AuthenticatedRequest): string {
  if (!request.user) {
    throw new Error("Authenticated user missing after auth middleware.");
  }

  return request.user.id;
}

export function createFieldReportsRouter(fieldReportStore: FieldReportStore): Router {
  const router = Router();

  router.use(authenticateJwt);

  router.get("/", async (request: AuthenticatedRequest, response, next) => {
    try {
      const filter = isReviewer(request) ? undefined : { authorUserId: ensureAuthenticatedUser(request) };
      const fieldReports = await fieldReportStore.list(filter);

      response.status(200).json({ fieldReports });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (request: AuthenticatedRequest, response, next) => {
    try {
      const fieldReport = await fieldReportStore.findById(request.params.id);

      if (!fieldReport) {
        response.status(404).json({ error: "Field report not found" });
        return;
      }

      if (!canReadReport(request, fieldReport)) {
        response.status(403).json({ error: "Forbidden" });
        return;
      }

      response.status(200).json({ fieldReport });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", async (request: AuthenticatedRequest, response, next) => {
    if (!isFieldUser(request)) {
      response.status(403).json({ error: "Only Field Users can create field reports" });
      return;
    }

    const validation = validateCreateFieldReport(request.body, ensureAuthenticatedUser(request));

    if (!validation.value) {
      response.status(400).json({ error: "Validation failed", errors: validation.errors });
      return;
    }

    try {
      const fieldReport = await fieldReportStore.create(validation.value);

      response.status(201).json({ fieldReport });
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", async (request: AuthenticatedRequest, response, next) => {
    if (!isReviewer(request)) {
      response.status(403).json({ error: "Only Admins and Project Managers can update field reports" });
      return;
    }

    const validation = validateUpdateFieldReport(request.body);

    if (!validation.value) {
      response.status(400).json({ error: "Validation failed", errors: validation.errors });
      return;
    }

    try {
      const fieldReport = await fieldReportStore.update(request.params.id, validation.value);

      if (!fieldReport) {
        response.status(404).json({ error: "Field report not found" });
        return;
      }

      response.status(200).json({ fieldReport });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
