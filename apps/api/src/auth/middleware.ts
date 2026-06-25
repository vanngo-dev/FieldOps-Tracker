import type { NextFunction, Request, RequestHandler, Response } from "express";

import { verifyAuthToken } from "./jwt";
import type { UserRole } from "./roles";
import type { AuthenticatedUser } from "./types";

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

function readBearerToken(request: Request): string | null {
  const header = request.header("authorization");

  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export function authenticateJwt(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
): void {
  const token = readBearerToken(request);

  if (!token) {
    response.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    request.user = verifyAuthToken(token);
    next();
  } catch {
    response.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRoles(...allowedRoles: UserRole[]): RequestHandler {
  return (request: AuthenticatedRequest, response, next) => {
    if (!request.user) {
      response.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(request.user.role)) {
      response.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
}
