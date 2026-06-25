import assert from "node:assert/strict";
import type { Express } from "express";
import request from "supertest";

import { createApp } from "../src/app";
import { hashPassword } from "../src/auth/password";
import type { AuthUserStore, LoginUserRecord } from "../src/auth/types";
import type { CreateProjectInput, ProjectRecord, ProjectStore, UpdateProjectInput } from "../src/projects/types";

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

function createInMemoryProjectStore(): ProjectStore {
  let nextId = 1;
  const projects = new Map<string, ProjectRecord>();

  function now(): string {
    return new Date("2026-01-01T00:00:00.000Z").toISOString();
  }

  function createRecord(input: CreateProjectInput): ProjectRecord {
    const timestamp = now();

    return {
      id: `project-${nextId++}`,
      projectCode: input.projectCode,
      name: input.name,
      description: input.description ?? null,
      clientName: input.clientName ?? null,
      siteLocation: input.siteLocation ?? null,
      projectManagerId: input.projectManagerId,
      status: input.status ?? "planned",
      plannedStartDate: input.plannedStartDate ?? null,
      plannedEndDate: input.plannedEndDate ?? null,
      actualStartDate: input.actualStartDate ?? null,
      actualEndDate: input.actualEndDate ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  return {
    async list(): Promise<ProjectRecord[]> {
      return Array.from(projects.values());
    },

    async findById(id: string): Promise<ProjectRecord | null> {
      return projects.get(id) ?? null;
    },

    async create(input: CreateProjectInput): Promise<ProjectRecord> {
      const project = createRecord(input);

      projects.set(project.id, project);

      return project;
    },

    async update(id: string, input: UpdateProjectInput): Promise<ProjectRecord | null> {
      const project = projects.get(id);

      if (!project) {
        return null;
      }

      const updated = {
        ...project,
        ...input,
        updatedAt: now(),
      };

      projects.set(id, updated);

      return updated;
    },

    async delete(id: string): Promise<boolean> {
      return projects.delete(id);
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

async function createProject(app: Express, token: string, projectCode: string): Promise<ProjectRecord> {
  const response = await request(app)
    .post("/projects")
    .set("Authorization", authorization(token))
    .send({
      projectCode,
      name: `Project ${projectCode}`,
      projectManagerId: "user-manager",
      clientName: "Internal Operations",
      siteLocation: "Local Test Yard",
      status: "planned",
    })
    .expect(201);

  return response.body.project as ProjectRecord;
}

process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_EXPIRES_IN = "1h";

async function testAnonymousAccessBlocked(app: Express): Promise<void> {
  await request(app).get("/projects").expect(401);
  await request(app).post("/projects").send({}).expect(401);

  console.log("Project routes block anonymous access");
}

async function testAdminAndManagerCanCreate(app: Express): Promise<void> {
  const adminToken = await login(app, "admin@example.com");
  const managerToken = await login(app, "manager@example.com");

  const adminProject = await createProject(app, adminToken, "FIELD-ADMIN");
  const managerProject = await createProject(app, managerToken, "FIELD-MANAGER");

  assert.equal(adminProject.projectCode, "FIELD-ADMIN");
  assert.equal(managerProject.projectCode, "FIELD-MANAGER");

  console.log("Admin and Project Manager can create projects");
}

async function testAdminAndManagerCanUpdateAndDelete(app: Express): Promise<void> {
  const adminToken = await login(app, "admin@example.com");
  const managerToken = await login(app, "manager@example.com");
  const project = await createProject(app, adminToken, "FIELD-EDIT");

  const updateResponse = await request(app)
    .put(`/projects/${project.id}`)
    .set("Authorization", authorization(managerToken))
    .send({ name: "Updated Field Project", status: "active" })
    .expect(200);

  assert.equal(updateResponse.body.project.name, "Updated Field Project");
  assert.equal(updateResponse.body.project.status, "active");

  await request(app)
    .delete(`/projects/${project.id}`)
    .set("Authorization", authorization(managerToken))
    .expect(204);

  await request(app).get(`/projects/${project.id}`).set("Authorization", authorization(adminToken)).expect(404);

  console.log("Admin and Project Manager can update and delete projects");
}

async function testFieldUserCannotWrite(app: Express): Promise<void> {
  const adminToken = await login(app, "admin@example.com");
  const fieldToken = await login(app, "field@example.com");
  const project = await createProject(app, adminToken, "FIELD-READONLY");

  await request(app)
    .post("/projects")
    .set("Authorization", authorization(fieldToken))
    .send({
      projectCode: "FIELD-BLOCKED",
      name: "Blocked Project",
      projectManagerId: "user-manager",
    })
    .expect(403);

  await request(app)
    .put(`/projects/${project.id}`)
    .set("Authorization", authorization(fieldToken))
    .send({ name: "Should Not Change" })
    .expect(403);

  await request(app)
    .delete(`/projects/${project.id}`)
    .set("Authorization", authorization(fieldToken))
    .expect(403);

  console.log("Field User cannot create, update, or delete projects");
}

async function testAuthenticatedUsersCanListAndRead(app: Express): Promise<void> {
  const adminToken = await login(app, "admin@example.com");
  const fieldToken = await login(app, "field@example.com");
  const project = await createProject(app, adminToken, "FIELD-LIST");

  const listResponse = await request(app)
    .get("/projects")
    .set("Authorization", authorization(fieldToken))
    .expect(200);

  assert.ok(Array.isArray(listResponse.body.projects));
  assert.ok(listResponse.body.projects.some((item: ProjectRecord) => item.id === project.id));

  const readResponse = await request(app)
    .get(`/projects/${project.id}`)
    .set("Authorization", authorization(fieldToken))
    .expect(200);

  assert.equal(readResponse.body.project.id, project.id);

  console.log("Authenticated users can list and read projects");
}

async function testValidationFailure(app: Express): Promise<void> {
  const adminToken = await login(app, "admin@example.com");

  const response = await request(app)
    .post("/projects")
    .set("Authorization", authorization(adminToken))
    .send({ status: "invalid" })
    .expect(400);

  assert.equal(response.body.error, "Validation failed");
  assert.ok(response.body.errors.includes("projectCode is required"));
  assert.ok(response.body.errors.includes("name is required"));
  assert.ok(response.body.errors.includes("projectManagerId is required"));
  assert.ok(response.body.errors.some((error: string) => error.startsWith("status must be one of:")));

  console.log("Project validation failures return useful errors");
}

async function run(): Promise<void> {
  const app = createApp({
    authUserStore: await createTestUserStore(),
    projectStore: createInMemoryProjectStore(),
  });

  await testAnonymousAccessBlocked(app);
  await testAdminAndManagerCanCreate(app);
  await testAdminAndManagerCanUpdateAndDelete(app);
  await testFieldUserCannotWrite(app);
  await testAuthenticatedUsersCanListAndRead(app);
  await testValidationFailure(app);
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
