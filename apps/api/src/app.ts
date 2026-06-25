import express, { type ErrorRequestHandler } from "express";

import { authenticateJwt, type AuthenticatedRequest, requireRoles } from "./auth/middleware";
import { createAuthRouter } from "./auth/routes";
import { roles } from "./auth/roles";
import type { AuthUserStore } from "./auth/types";
import { createPrismaAuthUserStore } from "./db/auth-users";
import { createPrismaProjectStore } from "./db/projects";
import { createProjectsRouter } from "./projects/routes";
import type { ProjectStore } from "./projects/types";

export interface AppOptions {
  authUserStore?: AuthUserStore;
  projectStore?: ProjectStore;
  includeAuthTestRoutes?: boolean;
}

export function createApp(options: AppOptions = {}): express.Express {
  const app = express();
  const authUserStore = options.authUserStore ?? createPrismaAuthUserStore();
  const projectStore = options.projectStore ?? createPrismaProjectStore();

  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.status(200).json({ status: "ok" });
  });

  app.use("/auth", createAuthRouter(authUserStore));
  app.use("/projects", createProjectsRouter(projectStore));

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
