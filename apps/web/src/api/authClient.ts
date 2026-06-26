import type { AuthSession, LoginCredentials } from "../auth/types";
import { getApiBaseUrl } from "./config";

export interface AuthApiClient {
  login(credentials: LoginCredentials): Promise<AuthSession>;
}

export type Fetcher = typeof fetch;

export function createAuthApiClient(
  apiBaseUrl = getApiBaseUrl(),
  fetcher: Fetcher = fetch,
): AuthApiClient {
  return {
    async login(credentials: LoginCredentials): Promise<AuthSession> {
      const response = await fetcher(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error("Invalid email or password");
      }

      return (await response.json()) as AuthSession;
    },
  };
}
