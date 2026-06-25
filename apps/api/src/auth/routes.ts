import { Router } from "express";

import { signAuthToken } from "./jwt";
import { verifyPassword } from "./password";
import type { AuthUserStore } from "./types";

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createAuthRouter(userStore: AuthUserStore): Router {
  const router = Router();

  router.post("/login", async (request, response, next) => {
    const body = request.body as LoginBody;

    if (typeof body.email !== "string" || typeof body.password !== "string") {
      response.status(401).json({ error: "Invalid email or password" });
      return;
    }

    try {
      const user = await userStore.findByEmail(normalizeEmail(body.email));
      const passwordMatches =
        user && user.status === "active"
          ? await verifyPassword(body.password, user.passwordHash)
          : false;

      if (!user || !passwordMatches) {
        response.status(401).json({ error: "Invalid email or password" });
        return;
      }

      const token = signAuthToken(user);

      response.status(200).json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
