import type { SignOptions } from "jsonwebtoken";

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: SignOptions["expiresIn"];
}

export interface AuthEnv {
  JWT_SECRET?: string;
  JWT_EXPIRES_IN?: string;
}

export function getAuthConfig(env: AuthEnv = process.env): AuthConfig {
  const jwtSecret = env.JWT_SECRET?.trim();

  if (!jwtSecret) {
    throw new Error("JWT_SECRET is required for authentication.");
  }

  return {
    jwtSecret,
    jwtExpiresIn: (env.JWT_EXPIRES_IN?.trim() || "1h") as SignOptions["expiresIn"],
  };
}
