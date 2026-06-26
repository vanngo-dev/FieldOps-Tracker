import type { AuthSession } from "./types";

export interface AuthStorage {
  load(): AuthSession | null;
  save(session: AuthSession): void;
  clear(): void;
}

const authStorageKey = "fieldops.auth";

function getSessionStorage(): Storage | null {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

export const browserAuthStorage: AuthStorage = {
  load(): AuthSession | null {
    const storage = getSessionStorage();
    const rawSession = storage?.getItem(authStorageKey);

    if (!rawSession) {
      return null;
    }

    try {
      return JSON.parse(rawSession) as AuthSession;
    } catch {
      storage?.removeItem(authStorageKey);
      return null;
    }
  },

  save(session: AuthSession): void {
    getSessionStorage()?.setItem(authStorageKey, JSON.stringify(session));
  },

  clear(): void {
    getSessionStorage()?.removeItem(authStorageKey);
  },
};

export function createMemoryAuthStorage(initialSession: AuthSession | null = null): AuthStorage {
  let session = initialSession;

  return {
    load(): AuthSession | null {
      return session;
    },

    save(nextSession: AuthSession): void {
      session = nextSession;
    },

    clear(): void {
      session = null;
    },
  };
}
