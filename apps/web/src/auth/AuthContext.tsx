import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { createAuthApiClient, type AuthApiClient } from "../api/authClient";
import { browserAuthStorage, type AuthStorage } from "./storage";
import type { AuthSession, LoginCredentials, AuthUser } from "./types";

export interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login(credentials: LoginCredentials): Promise<void>;
  logout(): void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
  apiClient?: AuthApiClient;
  storage?: AuthStorage;
}

export function createAuthController(
  apiClient: AuthApiClient,
  storage: AuthStorage,
  onSessionChange: (session: AuthSession | null) => void,
) {
  return {
    async login(credentials: LoginCredentials): Promise<void> {
      const session = await apiClient.login(credentials);

      storage.save(session);
      onSessionChange(session);
    },

    logout(): void {
      storage.clear();
      onSessionChange(null);
    },
  };
}

export function AuthProvider({
  children,
  apiClient = createAuthApiClient(),
  storage = browserAuthStorage,
}: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(() => storage.load());
  const controller = useMemo(
    () => createAuthController(apiClient, storage, setSession),
    [apiClient, storage],
  );
  const value = useMemo<AuthContextValue>(
    () => ({
      token: session?.token ?? null,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
      login: controller.login,
      logout: controller.logout,
    }),
    [controller.login, controller.logout, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
