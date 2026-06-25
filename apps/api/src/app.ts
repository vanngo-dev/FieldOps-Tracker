import express, { type ErrorRequestHandler } from "express";

import { authenticateJwt, type AuthenticatedRequest, requireRoles } from "./auth/middleware";
import { createAuthRouter } from "./auth/routes";
import { roles } from "./auth/roles";
import type { AuthUserStore } from "./auth/types";
import { createAssetsRouter } from "./assets/routes";
import type { AssetStore } from "./assets/types";
import { createPrismaAssetStore } from "./db/assets";
import { createPrismaAuthUserStore } from "./db/auth-users";
import { createPrismaFieldReportStore } from "./db/field-reports";
import { createPrismaProjectStore } from "./db/projects";
import { createPrismaTimesheetStore } from "./db/timesheets";
import { createFieldReportsRouter } from "./field-reports/routes";
import type { FieldReportStore } from "./field-reports/types";
import { createProjectsRouter } from "./projects/routes";
import type { ProjectStore } from "./projects/types";
import { createTimesheetsRouter } from "./timesheets/routes";
import type { TimesheetStore } from "./timesheets/types";

export interface AppOptions {
  authUserStore?: AuthUserStore;
  projectStore?: ProjectStore;
  timesheetStore?: TimesheetStore;
  fieldReportStore?: FieldReportStore;
  assetStore?: AssetStore;
  includeAuthTestRoutes?: boolean;
}

export function createApp(options: AppOptions = {}): express.Express {
  const app = express();
  const authUserStore = options.authUserStore ?? createPrismaAuthUserStore();
  const projectStore = options.projectStore ?? createPrismaProjectStore();
  const timesheetStore = options.timesheetStore ?? createPrismaTimesheetStore();
  const fieldReportStore = options.fieldReportStore ?? createPrismaFieldReportStore();
  const assetStore = options.assetStore ?? createPrismaAssetStore();

  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.use("/auth", createAuthRouter(authUserStore));
  app.use("/projects", createProjectsRouter(projectStore));
  app.use("/timesheets", createTimesheetsRouter(timesheetStore));
  app.use("/field-reports", createFieldReportsRouter(fieldReportStore));
  app.use("/assets", createAssetsRouter(assetStore));

  if (options.includeAuthTestRoutes) {
    app.get("/__test/protected", authenticateJwt, (request: AuthenticatedRequest, response) => {
      response.status(200).json({ user: request.user });
    });

    app.get(
      "/__test/admin",
      authenticateJwt,
      requireRoles(roles.admin),
      (_request, response) => response.status(200).json({ status: "ok" }),
    );

    app.get(
      "/__test/manager",
      authenticateJwt,
      requireRoles(roles.projectManager),
      (_request, response) => response.status(200).json({ status: "ok" }),
    );

    app.get(
      "/__test/field",
      authenticateJwt,
      requireRoles(roles.fieldUser),
      (_request, response) => response.status(200).json({ status: "ok" }),
    );
  }

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({ error: "Internal server error" });
  };

  app.use(errorHandler);

  return app;
}

export const app = createApp();
