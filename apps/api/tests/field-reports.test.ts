import assert from "node:assert/strict";
import type { Express } from "express";
import request from "supertest";

import { createApp } from "../src/app";
import { hashPassword } from "../src/auth/password";
import type { AuthUserStore, LoginUserRecord } from "../src/auth/types";
import type {
  CreateFieldReportInput,
  FieldReportListFilter,
  FieldReportRecord,
  FieldReportStore,
  UpdateFieldReportInput,
} from "../src/field-reports/types";

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

function createInMemoryFieldReportStore(): FieldReportStore {
  let nextId = 1;
  const fieldReports = new Map<string, FieldReportRecord>();

  function now(): string {
    return new Date("2026-01-01T00:00:00.000Z").toISOString();
  }

  function createRecord(input: CreateFieldReportInput): FieldReportRecord {
    const timestamp = now();

    return {
      id: `field-report-${nextId++}`,
      projectId: input.projectId,
      authorUserId: input.authorUserId,
      reportDate: input.reportDate,
      laborCount: input.laborCount,
      workCompleted: input.workCompleted,
      blockers: input.blockers ?? null,
      equipmentUsedNotes: input.equipmentUsedNotes ?? null,
      status: "draft",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  return {
    async list(filter?: FieldReportListFilter): Promise<FieldReportRecord[]> {
      const values = Array.from(fieldReports.values());

      return filter?.authorUserId
        ? values.filter((fieldReport) => fieldReport.authorUserId === filter.authorUserId)
        : values;
    },

    async findById(id: string): Promise<FieldReportRecord | null> {
      return fieldReports.get(id) ?? null;
    },

    async create(input: CreateFieldReportInput): Promise<FieldReportRecord> {
      const fieldReport = createRecord(input);

      fieldReports.set(fieldReport.id, fieldReport);

      return fieldReport;
    },

    async update(id: string, input: UpdateFieldReportInput): Promise<FieldReportRecord | null> {
      const existing = fieldReports.get(id);

      if (!existing) {
        return null;
      }

      const updated = {
        ...existing,
        ...input,
        updatedAt: now(),
      };

      fieldReports.set(id, updated);

      return updated;
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

async function createFieldReport(app: Express, token: string): Promise<FieldReportRecord> {
  const response = await request(app)
    .post("/field-reports")
    .set("Authorization", authorization(token))
    .send({
      projectId: "project-1",
      reportDate: "2026-01-15",
      laborCount: 6,
      workCompleted: "Completed trench layout and installed marker posts.",
      blockers: "Awaiting inspection window.",
      equipmentUsedNotes: "Used excavator EX-12 and laser level.",
    })
    .expect(201);

  return response.body.fieldReport as FieldReportRecord;
}

process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_EXPIRES_IN = "1h";

async function testAnonymousAccessBlocked(app: Express): Promise<void> {
  await request(app).get("/field-reports").expect(401);
  await request(app).post("/field-reports").send({}).expect(401);

  console.log("Field report routes block anonymous access");
}

async function testFieldUserCanCreateReport(app: Express): Promise<void> {
  const fieldToken = await login(app, "field@example.com");
  const fieldReport = await createFieldReport(app, fieldToken);

  assert.equal(fieldReport.authorUserId, "user-field");
  assert.equal(fieldReport.laborCount, 6);
  assert.equal(fieldReport.workCompleted, "Completed trench layout and installed marker posts.");

  console.log("Field User can create a daily field report");
}

async function testFieldUserCanViewOwnReports(app: Express): Promise<void> {
  const fieldToken = await login(app, "field@example.com");
  const fieldReport = await createFieldReport(app, fieldToken);

  const listResponse = await request(app)
    .get("/field-reports")
    .set("Authorization", authorization(fieldToken))
    .expect(200);

  assert.ok(listResponse.body.fieldReports.some((item: FieldReportRecord) => item.id === fieldReport.id));

  const readResponse = await request(app)
    .get(`/field-reports/${fieldReport.id}`)
    .set("Authorization", authorization(fieldToken))
    .expect(200);

  assert.equal(readResponse.body.fieldReport.id, fieldReport.id);

  console.log("Field User can view their own field reports");
}

async function testManagerAndAdminCanViewAllReports(app: Express, store: FieldReportStore): Promise<void> {
  const fieldToken = await login(app, "field@example.com");
  const managerToken = await login(app, "manager@example.com");
  const adminToken = await login(app, "admin@example.com");
  const fieldReport = await createFieldReport(app, fieldToken);
  const otherReport = await store.create({
    projectId: "project-2",
    authorUserId: "other-field-user",
    reportDate: "2026-01-16T00:00:00.000Z",
    laborCount: 3,
    workCompleted: "Completed cleanup and material staging.",
  });

  const managerList = await request(app)
    .get("/field-reports")
    .set("Authorization", authorization(managerToken))
    .expect(200);

  const adminList = await request(app)
    .get("/field-reports")
    .set("Authorization", authorization(adminToken))
    .expect(200);

  assert.ok(managerList.body.fieldReports.some((item: FieldReportRecord) => item.id === fieldReport.id));
  assert.ok(managerList.body.fieldReports.some((item: FieldReportRecord) => item.id === otherReport.id));
  assert.ok(adminList.body.fieldReports.some((item: FieldReportRecord) => item.id === fieldReport.id));
  assert.ok(adminList.body.fieldReports.some((item: FieldReportRecord) => item.id === otherReport.id));

  console.log("Manager and Admin can view all field reports");
}

async function testManagerAndAdminCanUpdateReports(app: Express): Promise<void> {
  const fieldToken = await login(app, "field@example.com");
  const managerToken = await login(app, "manager@example.com");
  const adminToken = await login(app, "admin@example.com");
  const managerReport = await createFieldReport(app, fieldToken);
  const adminReport = await createFieldReport(app, fieldToken);

  const managerUpdate = await request(app)
    .put(`/field-reports/${managerReport.id}`)
    .set("Authorization", authorization(managerToken))
    .send({ laborCount: 7, blockers: null })
    .expect(200);

  const adminUpdate = await request(app)
    .put(`/field-reports/${adminReport.id}`)
    .set("Authorization", authorization(adminToken))
    .send({ equipmentUsedNotes: "Updated crane and truck notes." })
    .expect(200);

  assert.equal(managerUpdate.body.fieldReport.laborCount, 7);
  assert.equal(managerUpdate.body.fieldReport.blockers, null);
  assert.equal(adminUpdate.body.fieldReport.equipmentUsedNotes, "Updated crane and truck notes.");

  console.log("Manager and Admin can update field reports");
}

async function testMissingProjectAndDateValidation(app: Express): Promise<void> {
  const fieldToken = await login(app, "field@example.com");
  const response = await request(app)
    .post("/field-reports")
    .set("Authorization", authorization(fieldToken))
    .send({ laborCount: 4, workCompleted: "Completed survey work." })
    .expect(400);

  assert.equal(response.body.error, "Validation failed");
  assert.ok(response.body.errors.includes("projectId is required"));
  assert.ok(response.body.errors.includes("reportDate is required"));

  console.log("Field report validation catches missing project and date");
}

async function testInvalidLaborCountValidation(app: Express): Promise<void> {
  const fieldToken = await login(app, "field@example.com");
  const response = await request(app)
    .post("/field-reports")
    .set("Authorization", authorization(fieldToken))
    .send({
      projectId: "project-1",
      reportDate: "2026-01-15",
      laborCount: -1,
      workCompleted: "Completed survey work.",
    })
    .expect(400);

  assert.equal(response.body.error, "Validation failed");
  assert.ok(response.body.errors.includes("laborCount must be a whole number greater than or equal to 0"));

  console.log("Field report validation catches invalid labor count");
}

async function testPermissionFailuresReturnUsefulErrors(app: Express, store: FieldReportStore): Promise<void> {
  const fieldToken = await login(app, "field@example.com");
  const managerToken = await login(app, "manager@example.com");
  const fieldReport = await createFieldReport(app, fieldToken);
  const otherReport = await store.create({
    projectId: "project-3",
    authorUserId: "other-field-user",
    reportDate: "2026-01-17T00:00:00.000Z",
    laborCount: 2,
    workCompleted: "Completed erosion control check.",
  });

  const managerCreate = await request(app)
    .post("/field-reports")
    .set("Authorization", authorization(managerToken))
    .send({
      projectId: "project-1",
      reportDate: "2026-01-15",
      laborCount: 4,
      workCompleted: "Should not be created by manager.",
    })
    .expect(403);

  const fieldUpdate = await request(app)
    .put(`/field-reports/${fieldReport.id}`)
    .set("Authorization", authorization(fieldToken))
    .send({ laborCount: 5 })
    .expect(403);

  const fieldReadOther = await request(app)
    .get(`/field-reports/${otherReport.id}`)
    .set("Authorization", authorization(fieldToken))
    .expect(403);

  assert.equal(managerCreate.body.error, "Only Field Users can create field reports");
  assert.equal(fieldUpdate.body.error, "Only Admins and Project Managers can update field reports");
  assert.equal(fieldReadOther.body.error, "Forbidden");

  console.log("Field report permission failures return useful errors");
}

async function run(): Promise<void> {
  const fieldReportStore = createInMemoryFieldReportStore();
  const app = createApp({
    authUserStore: await createTestUserStore(),
    fieldReportStore,
  });

  await testAnonymousAccessBlocked(app);
  await testFieldUserCanCreateReport(app);
  await testFieldUserCanViewOwnReports(app);
  await testManagerAndAdminCanViewAllReports(app, fieldReportStore);
  await testManagerAndAdminCanUpdateReports(app);
  await testMissingProjectAndDateValidation(app);
  await testInvalidLaborCountValidation(app);
  await testPermissionFailuresReturnUsefulErrors(app, fieldReportStore);
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
