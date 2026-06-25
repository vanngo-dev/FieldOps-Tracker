import { Router } from "express";

import { authenticateJwt, requireRoles } from "../auth/middleware";
import { roles } from "../auth/roles";
import type { ProjectStore } from "./types";
import { validateCreateProject, validateUpdateProject } from "./validation";

const projectEditors = [roles.admin, roles.projectManager];

export function createProjectsRouter(projectStore: ProjectStore): Router {
  const router = Router();

  router.use(authenticateJwt);

  router.get("/", async (_request, response, next) => {
    try {
      const projects = await projectStore.list();

      response.status(200).json({ projects });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (request, response, next) => {
    try {
      const project = await projectStore.findById(request.params.id);

      if (!project) {
        response.status(404).json({ error: "Project not found" });
        return;
      }

      response.status(200).json({ project });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", requireRoles(...projectEditors), async (request, response, next) => {
    const validation = validateCreateProject(request.body);

    if (!validation.value) {
      response.status(400).json({ error: "Validation failed", errors: validation.errors });
      return;
    }

    try {
      const project = await projectStore.create(validation.value);

      response.status(201).json({ project });
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", requireRoles(...projectEditors), async (request, response, next) => {
    const validation = validateUpdateProject(request.body);

    if (!validation.value) {
      response.status(400).json({ error: "Validation failed", errors: validation.errors });
      return;
    }

    try {
      const project = await projectStore.update(request.params.id, validation.value);

      if (!project) {
        response.status(404).json({ error: "Project not found" });
        return;
      }

      response.status(200).json({ project });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", requireRoles(...projectEditors), async (request, response, next) => {
    try {
      const deleted = await projectStore.delete(request.params.id);

      if (!deleted) {
        response.status(404).json({ error: "Project not found" });
        return;
      }

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
