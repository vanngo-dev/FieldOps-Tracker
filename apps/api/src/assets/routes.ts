import { Router } from "express";

import { authenticateJwt, requireRoles } from "../auth/middleware";
import { roles } from "../auth/roles";
import type { AssetStore } from "./types";
import { validateAssignAsset, validateCreateAsset, validateUpdateAsset } from "./validation";

const assetEditors = [roles.admin, roles.projectManager];

export function createAssetsRouter(assetStore: AssetStore): Router {
  const router = Router();

  router.use(authenticateJwt);

  router.get("/", async (_request, response, next) => {
    try {
      const assets = await assetStore.list();

      response.status(200).json({ assets });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:id", async (request, response, next) => {
    try {
      const asset = await assetStore.findById(request.params.id);

      if (!asset) {
        response.status(404).json({ error: "Asset not found" });
        return;
      }

      response.status(200).json({ asset });
    } catch (error) {
      next(error);
    }
  });

  router.post("/", requireRoles(...assetEditors), async (request, response, next) => {
    const validation = validateCreateAsset(request.body);

    if (!validation.value) {
      response.status(400).json({ error: "Validation failed", errors: validation.errors });
      return;
    }

    try {
      const asset = await assetStore.create(validation.value);

      response.status(201).json({ asset });
    } catch (error) {
      next(error);
    }
  });

  router.put("/:id", requireRoles(...assetEditors), async (request, response, next) => {
    const validation = validateUpdateAsset(request.body);

    if (!validation.value) {
      response.status(400).json({ error: "Validation failed", errors: validation.errors });
      return;
    }

    try {
      const asset = await assetStore.update(request.params.id, validation.value);

      if (!asset) {
        response.status(404).json({ error: "Asset not found" });
        return;
      }

      response.status(200).json({ asset });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:id/assign", requireRoles(...assetEditors), async (request, response, next) => {
    const validation = validateAssignAsset(request.body);

    if (!validation.value) {
      response.status(400).json({ error: "Validation failed", errors: validation.errors });
      return;
    }

    try {
      const result = await assetStore.assignToProject(request.params.id, validation.value.projectId);

      if (result.status === "asset_not_found") {
        response.status(404).json({ error: "Asset not found" });
        return;
      }

      if (result.status === "project_not_found") {
        response.status(404).json({ error: "Assigned project not found" });
        return;
      }

      response.status(200).json({ asset: result.asset });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
