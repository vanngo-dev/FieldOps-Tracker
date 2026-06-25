import assert from "node:assert/strict";
import type { Express } from "express";
import request from "supertest";

import { createApp } from "../src/app";
import type { AssetRecord, AssetStore, AssignAssetResult, CreateAssetInput, UpdateAssetInput } from "../src/assets/types";
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

function createInMemoryAssetStore(projectIds = new Set(["project-1", "project-2"])): AssetStore {
  let nextId = 1;
  const assets = new Map<string, AssetRecord>();

  function now(): string {
    return new Date("2026-01-01T00:00:00.000Z").toISOString();
  }

  function createRecord(input: CreateAssetInput): AssetRecord {
    return {
      id: `asset-${nextId++}`,
      name: input.name,
      assetTag: input.assetTag,
      assetType: input.assetType ?? "equipment",
      status: input.status,
      assignedProjectId: input.assignedProjectId ?? null,
      updatedAt: now(),
    };
  }

  return {
    async list(): Promise<AssetRecord[]> {
      return Array.from(assets.values());
    },

    async findById(id: string): Promise<AssetRecord | null> {
      return assets.get(id) ?? null;
    },

    async create(input: CreateAssetInput): Promise<AssetRecord> {
      const asset = createRecord(input);

      assets.set(asset.id, asset);

      return asset;
    },

    async update(id: string, input: UpdateAssetInput): Promise<AssetRecord | null> {
      const existing = assets.get(id);

      if (!existing) {
        return null;
      }

      const updated = {
        ...existing,
        ...input,
        updatedAt: now(),
      };

      assets.set(id, updated);

      return updated;
    },

    async assignToProject(id: string, projectId: string): Promise<AssignAssetResult> {
      const existing = assets.get(id);

      if (!existing) {
        return { status: "asset_not_found" };
      }

      if (!projectIds.has(projectId)) {
        return { status: "project_not_found" };
      }

      const assigned = {
        ...existing,
        assignedProjectId: projectId,
        status: "assigned" as const,
        updatedAt: now(),
      };

      assets.set(id, assigned);

      return { status: "assigned", asset: assigned };
    },
  };
}

async function login(app: Express, email: string): Promise<string> {
  const response = await request(app)
    .post("/auth/login")
    .send({ email, password: demoPassword })
    .expect(200);

  return response.body.token as string;
}

async function createAsset(app: Express, token: string, assetTag: string): Promise<AssetRecord> {
  const response = await request(app)
    .post("/assets")
    .set("Authorization", authorization(token))
    .send({
      name: `Excavator ${assetTag}`,
      assetTag,
      assetType: "equipment",
      status: "available",
    })
    .expect(201);

  return response.body.asset as AssetRecord;
}

process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_EXPIRES_IN = "1h";

async function testAnonymousAccessBlocked(app: Express): Promise<void> {
  await request(app).get("/assets").expect(401);
  await request(app).post("/assets").send({}).expect(401);

  console.log("Asset routes block anonymous access");
}

async function testAuthenticatedUsersCanListAndRead(app: Express): Promise<void> {
  const adminToken = await login(app, "admin@example.com");
  const fieldToken = await login(app, "field@example.com");
  const asset = await createAsset(app, adminToken, "EQ-READ");

  const listResponse = await request(app)
    .get("/assets")
    .set("Authorization", authorization(fieldToken))
    .expect(200);

  assert.ok(listResponse.body.assets.some((item: AssetRecord) => item.id === asset.id));

  const readResponse = await request(app)
    .get(`/assets/${asset.id}`)
    .set("Authorization", authorization(fieldToken))
    .expect(200);

  assert.equal(readResponse.body.asset.assetTag, "EQ-READ");

  console.log("Authenticated users can list and read assets");
}

async function testAdminAndManagerCanCreate(app: Express): Promise<void> {
  const adminToken = await login(app, "admin@example.com");
  const managerToken = await login(app, "manager@example.com");
  const adminAsset = await createAsset(app, adminToken, "EQ-ADMIN");
  const managerAsset = await createAsset(app, managerToken, "EQ-MANAGER");

  assert.equal(adminAsset.assetTag, "EQ-ADMIN");
  assert.equal(managerAsset.assetTag, "EQ-MANAGER");

  console.log("Admin and Project Manager can create assets");
}

async function testAdminAndManagerCanUpdate(app: Express): Promise<void> {
  const adminToken = await login(app, "admin@example.com");
  const managerToken = await login(app, "manager@example.com");
  const adminAsset = await createAsset(app, adminToken, "EQ-ADMIN-UPDATE");
  const managerAsset = await createAsset(app, adminToken, "EQ-MANAGER-UPDATE");

  const adminUpdate = await request(app)
    .put(`/assets/${adminAsset.id}`)
    .set("Authorization", authorization(adminToken))
    .send({ name: "Updated Admin Asset", status: "maintenance" })
    .expect(200);

  const managerUpdate = await request(app)
    .put(`/assets/${managerAsset.id}`)
    .set("Authorization", authorization(managerToken))
    .send({ name: "Updated Manager Asset", status: "retired" })
    .expect(200);

  assert.equal(adminUpdate.body.asset.name, "Updated Admin Asset");
  assert.equal(adminUpdate.body.asset.status, "maintenance");
  assert.equal(managerUpdate.body.asset.name, "Updated Manager Asset");
  assert.equal(managerUpdate.body.asset.status, "retired");

  console.log("Admin and Project Manager can update assets");
}

async function testAdminAndManagerCanAssign(app: Express): Promise<void> {
  const adminToken = await login(app, "admin@example.com");
  const managerToken = await login(app, "manager@example.com");
  const adminAsset = await createAsset(app, adminToken, "EQ-ADMIN-ASSIGN");
  const managerAsset = await createAsset(app, adminToken, "EQ-MANAGER-ASSIGN");

  const adminAssign = await request(app)
    .post(`/assets/${adminAsset.id}/assign`)
    .set("Authorization", authorization(adminToken))
    .send({ projectId: "project-1" })
    .expect(200);

  const managerAssign = await request(app)
    .post(`/assets/${managerAsset.id}/assign`)
    .set("Authorization", authorization(managerToken))
    .send({ projectId: "project-2" })
    .expect(200);

  assert.equal(adminAssign.body.asset.status, "assigned");
  assert.equal(adminAssign.body.asset.assignedProjectId, "project-1");
  assert.equal(managerAssign.body.asset.status, "assigned");
  assert.equal(managerAssign.body.asset.assignedProjectId, "project-2");

  console.log("Admin and Project Manager can assign assets to projects");
}

async function testFieldUserCannotWrite(app: Express): Promise<void> {
  const adminToken = await login(app, "admin@example.com");
  const fieldToken = await login(app, "field@example.com");
  const asset = await createAsset(app, adminToken, "EQ-FIELD-BLOCKED");

  await request(app)
    .post("/assets")
    .set("Authorization", authorization(fieldToken))
    .send({ name: "Blocked Asset", assetTag: "EQ-BLOCKED", status: "available" })
    .expect(403);

  await request(app)
    .put(`/assets/${asset.id}`)
    .set("Authorization", authorization(fieldToken))
    .send({ name: "Should Not Update" })
    .expect(403);

  await request(app)
    .post(`/assets/${asset.id}/assign`)
    .set("Authorization", authorization(fieldToken))
    .send({ projectId: "project-1" })
    .expect(403);

  console.log("Field User cannot create, update, or assign assets");
}

async function testValidationFailure(app: Express): Promise<void> {
  const adminToken = await login(app, "admin@example.com");
  const response = await request(app)
    .post("/assets")
    .set("Authorization", authorization(adminToken))
    .send({ status: "lost" })
    .expect(400);

  assert.equal(response.body.error, "Validation failed");
  assert.ok(response.body.errors.includes("name is required"));
  assert.ok(response.body.errors.includes("assetTag is required"));
  assert.ok(response.body.errors.some((error: string) => error.startsWith("status must be one of:")));

  console.log("Asset validation failures return useful errors");
}

async function testAssignMissingProject(app: Express): Promise<void> {
  const adminToken = await login(app, "admin@example.com");
  const asset = await createAsset(app, adminToken, "EQ-MISSING-PROJECT");
  const response = await request(app)
    .post(`/assets/${asset.id}/assign`)
    .set("Authorization", authorization(adminToken))
    .send({ projectId: "missing-project" })
    .expect(404);

  assert.equal(response.body.error, "Assigned project not found");

  console.log("Assigning an asset to a missing project returns a useful error");
}

async function run(): Promise<void> {
  const app = createApp({
    authUserStore: await createTestUserStore(),
    assetStore: createInMemoryAssetStore(),
  });

  await testAnonymousAccessBlocked(app);
  await testAuthenticatedUsersCanListAndRead(app);
  await testAdminAndManagerCanCreate(app);
  await testAdminAndManagerCanUpdate(app);
  await testAdminAndManagerCanAssign(app);
  await testFieldUserCannotWrite(app);
  await testValidationFailure(app);
  await testAssignMissingProject(app);
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
