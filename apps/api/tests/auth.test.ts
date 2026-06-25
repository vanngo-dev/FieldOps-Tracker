import assert from "node:assert/strict";
import type { Express } from "express";
import request from "supertest";

import { createApp } from "../src/app";
import { hashPassword } from "../src/auth/password";
import type { AuthUserStore, LoginUserRecord } from "../src/auth/types";

const demoPassword = "Password123!";

function authorization(token: string): string {
  return `Bearer ${token}`;
}

async function createTestUserStore(): Promise<AuthUserStore> {
  const passwordHash = await hashPassword(demoPassword);
  const users = new Map<string, LoginUserRecord>([
    [
      "admin@example.com",
      {
        id: "user-admin",
        name: "FieldOps Admin",
        email: "admin@example.com",
        passwordHash,
        role: "admin",
        status: "active",
      },
    ],
    [
      "manager@example.com",
      {
        id: "user-manager",
        name: "Project Manager",
        email: "manager@example.com",
        passwordHash,
        role: "project_manager",
        status: "active",
      },
    ],
    [
      "field@example.com",
      {
        id: "user-field",
        name: "Field User",
        email: "field@example.com",
        passwordHash,
        role: "field_user",
        status: "active",
      },
    ],
  ]);

  return {
    async findByEmail(email: string): Promise<LoginUserRecord | null> {
      return users.get(email) ?? null;
    },
  };
}

async function login(app: Express, email: string, password = demoPassword): Promise<string> {
  const response = await request(app)
    .post("/auth/login")
    .send({ email, password })
    .expect(200);

  assert.equal(typeof response.body.token, "string");
  assert.equal(response.body.user.email, email);
  assert.equal(response.body.user.passwordHash, undefined);

  return response.body.token as string;
}

process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_EXPIRES_IN = "1h";

async function testSuccessfulLogin(app: Express): Promise<string> {
  const token = await login(app, "admin@example.com");

  console.log("POST /auth/login returns a JWT for a valid seeded user");
  return token;
}

async function testInvalidLogin(app: Express): Promise<void> {
  await request(app)
    .post("/auth/login")
    .send({ email: "admin@example.com", password: "wrong-password" })
    .expect(401);

  console.log("POST /auth/login rejects invalid credentials");
}

async function testAnonymousRequestBlocked(app: Express): Promise<void> {
  await request(app).get("/__test/protected").expect(401);

  console.log("Protected route rejects anonymous requests");
}

async function testValidTokenAccepted(app: Express, token: string): Promise<void> {
  const response = await request(app)
    .get("/__test/protected")
    .set("Authorization", authorization(token))
    .expect(200);

  assert.equal(response.body.user.email, "admin@example.com");
  assert.equal(response.body.user.role, "admin");

  console.log("Protected route accepts a valid JWT");
}

async function testRoleMiddlewareAllowsCorrectRoles(app: Express): Promise<void> {
  const adminToken = await login(app, "admin@example.com");
  const managerToken = await login(app, "manager@example.com");
  const fieldToken = await login(app, "field@example.com");

  await request(app).get("/__test/admin").set("Authorization", authorization(adminToken)).expect(200);
  await request(app).get("/__test/manager").set("Authorization", authorization(managerToken)).expect(200);
  await request(app).get("/__test/field").set("Authorization", authorization(fieldToken)).expect(200);

  console.log("Role middleware allows Admin, Project Manager, and Field User routes");
}

async function testRoleMiddlewareBlocksWrongRole(app: Express): Promise<void> {
  const fieldToken = await login(app, "field@example.com");

  await request(app).get("/__test/admin").set("Authorization", authorization(fieldToken)).expect(403);

  console.log("Role middleware blocks a user with the wrong role");
}

async function run(): Promise<void> {
  const app = createApp({
    authUserStore: await createTestUserStore(),
    includeAuthTestRoutes: true,
  });
  const adminToken = await testSuccessfulLogin(app);

  await testInvalidLogin(app);
  await testAnonymousRequestBlocked(app);
  await testValidTokenAccepted(app, adminToken);
  await testRoleMiddlewareAllowsCorrectRoles(app);
  await testRoleMiddlewareBlocksWrongRole(app);
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
