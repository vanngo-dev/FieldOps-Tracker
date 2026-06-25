import jwt from "jsonwebtoken";

import { getAuthConfig, type AuthConfig } from "../config/auth";
import { isUserRole } from "./roles";
import type { AuthenticatedUser } from "./types";

interface AuthTokenPayload {
  sub: string;
  name: string;
  email: string;
  role: string;
}

export function signAuthToken(
  user: AuthenticatedUser,
  config: AuthConfig = getAuthConfig(),
): string {
  const payload: AuthTokenPayload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export function verifyAuthToken(
  token: string,
  config: AuthConfig = getAuthConfig(),
): AuthenticatedUser {
  const decoded = jwt.verify(token, config.jwtSecret);

  if (!decoded || typeof decoded !== "object") {
    throw new Error("Invalid token payload.");
  }

  const payload = decoded as Partial<AuthTokenPayload>;

  if (
    typeof payload.sub !== "string" ||
    typeof payload.name !== "string" ||
    typeof payload.email !== "string" ||
    !isUserRole(payload.role)
  ) {
    throw new Error("Invalid token payload.");
  }

  return {
    id: payload.sub,
    name: payload.name,
    email: payload.email,
    role: payload.role,
  };
}
