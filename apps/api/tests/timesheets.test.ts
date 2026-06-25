import assert from "node:assert/strict";
import type { Express } from "express";
import request from "supertest";

import { createApp } from "../src/app";
import { hashPassword } from "../src/auth/password";
import type { AuthUserStore, LoginUserRecord } from "../src/auth/types";
import type {
  CreateTimesheetInput,
  TimesheetListFilter,
  TimesheetRecord,
  TimesheetStore,
  UpdateTimesheetInput,
} from "../src/timesheets/types";

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

function createInMemoryTimesheetStore(): TimesheetStore {
  let nextId = 1;
  const timesheets = new Map<string, TimesheetRecord>();

  function now(): string {
    return new Date("2026-01-01T00:00:00.000Z").toISOString();
  }

  function createRecord(input: CreateTimesheetInput): TimesheetRecord {
    const timestamp = now();

    return {
      id: `timesheet-${nextId++}`,
      projectId: input.projectId,
      employeeId: input.employeeId,
      submittedByUserId: input.submittedByUserId,
      workDate: input.workDate,
      regularHours: input.regularHours,
      overtimeHours: input.overtimeHours ?? 0,
      notes: input.notes ?? null,
      status: "draft",
      submittedAt: null,
      approvedAt: null,
      approvedByUserId: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  function updateRecord(id: string, updates: Partial<TimesheetRecord>): TimesheetRecord | null {
    const existing = timesheets.get(id);

    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: now(),
    };

    timesheets.set(id, updated);

    return updated;
  }

  return {
    async list(filter?: TimesheetListFilter): Promise<TimesheetRecord[]> {
      const values = Array.from(timesheets.values());

      return filter?.submittedByUserId
        ? values.filter((timesheet) => timesheet.submittedByUserId === filter.submittedByUserId)
        : values;
    },

    async findById(id: string): Promise<TimesheetRecord | null> {
      return timesheets.get(id) ?? null;
    },

    async create(input: CreateTimesheetInput): Promise<TimesheetRecord> {
      const timesheet = createRecord(input);

      timesheets.set(timesheet.id, timesheet);

      return timesheet;
    },

    async update(id: string, input: UpdateTimesheetInput): Promise<TimesheetRecord | null> {
      return updateRecord(id, input);
    },

    async submit(id: string): Promise<TimesheetRecord | null> {
      return updateRecord(id, {
        status: "submitted",
        submittedAt: now(),
      });
    },

    async approve(id: string, approvedByUserId: string): Promise<TimesheetRecord | null> {
      return updateRecord(id, {
        status: "approved",
        approvedAt: now(),
        approvedByUserId,
      });
    },

    async reject(id: string): Promise<TimesheetRecord | null> {
      return updateRecord(id, {
        status: "rejected",
      });
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

async function createTimesheet(app: Express, token: string): Promise<TimesheetRecord> {
  const response = await request(app)
    .post("/timesheets")
    .set("Authorization", authorization(token))
    .send({
      projectId: "project-1",
      employeeId: "employee-1",
      workDate: "2026-01-15",
      regularHours: 8,
      overtimeHours: 1,
      notes: "Installed conduit and verified materials.",
    })
    .expect(201);

  return response.body.timesheet as TimesheetRecord;
}

async function submitTimesheet(app: Express, token: string, id: string): Promise<TimesheetRecord> {
  const response = await request(app)
    .post(`/timesheets/${id}/submit`)
    .set("Authorization", authorization(token))
    .expect(200);

  return response.body.timesheet as TimesheetRecord;
}

process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_EXPIRES_IN = "1h";

async function testAnonymousAccessBlocked(app: Express): Promise<void> {
  await request(app).get("/timesheets").expect(401);
  await request(app).post("/timesheets").send({}).expect(401);

  console.log("Timesheet routes block anonymous access");
}

async function testFieldUserCanCreateOwnDraft(app: Express): Promise<void> {
  const fieldToken = await login(app, "field@example.com");
  const timesheet = await createTimesheet(app, fieldToken);

  assert.equal(timesheet.status, "draft");
  assert.equal(timesheet.submittedByUserId, "user-field");
  assert.equal(timesheet.regularHours, 8);

  console.log("Field User can create own draft timesheet");
}

async function testFieldUserCanEditOwnDraft(app: Express): Promise<void> {
  const fieldToken = await login(app, "field@example.com");
  const timesheet = await createTimesheet(app, fieldToken);
  const response = await request(app)
    .put(`/timesheets/${timesheet.id}`)
    .set("Authorization", authorization(fieldToken))
    .send({ regularHours: 7, overtimeHours: 2, notes: "Adjusted hours before submission." })
    .expect(200);

  assert.equal(response.body.timesheet.regularHours, 7);
  assert.equal(response.body.timesheet.overtimeHours, 2);
  assert.equal(response.body.timesheet.notes, "Adjusted hours before submission.");

  console.log("Field User can edit own draft timesheet");
}

async function testFieldUserCanSubmitOwnDraft(app: Express): Promise<void> {
  const fieldToken = await login(app, "field@example.com");
  const timesheet = await createTimesheet(app, fieldToken);
  const submitted = await submitTimesheet(app, fieldToken, timesheet.id);

  assert.equal(submitted.status, "submitted");
  assert.equal(typeof submitted.submittedAt, "string");

  console.log("Field User can submit own draft timesheet");
}

async function testFieldUserCannotApproveOrReject(app: Express): Promise<void> {
  const fieldToken = await login(app, "field@example.com");
  const timesheet = await createTimesheet(app, fieldToken);
  const submitted = await submitTimesheet(app, fieldToken, timesheet.id);

  await request(app)
    .post(`/timesheets/${submitted.id}/approve`)
    .set("Authorization", authorization(fieldToken))
    .expect(403);

  await request(app)
    .post(`/timesheets/${submitted.id}/reject`)
    .set("Authorization", authorization(fieldToken))
    .expect(403);

  console.log("Field User cannot approve or reject timesheets");
}

async function testManagerAndAdminCanApproveSubmitted(app: Express): Promise<void> {
  const fieldToken = await login(app, "field@example.com");
  const managerToken = await login(app, "manager@example.com");
  const adminToken = await login(app, "admin@example.com");
  const managerTimesheet = await submitTimesheet(app, fieldToken, (await createTimesheet(app, fieldToken)).id);
  const adminTimesheet = await submitTimesheet(app, fieldToken, (await createTimesheet(app, fieldToken)).id);

  const managerApproval = await request(app)
    .post(`/timesheets/${managerTimesheet.id}/approve`)
    .set("Authorization", authorization(managerToken))
    .expect(200);

  const adminApproval = await request(app)
    .post(`/timesheets/${adminTimesheet.id}/approve`)
    .set("Authorization", authorization(adminToken))
    .expect(200);

  assert.equal(managerApproval.body.timesheet.status, "approved");
  assert.equal(managerApproval.body.timesheet.approvedByUserId, "user-manager");
  assert.equal(adminApproval.body.timesheet.status, "approved");
  assert.equal(adminApproval.body.timesheet.approvedByUserId, "user-admin");

  console.log("Manager and Admin can approve submitted timesheets");
}

async function testManagerAndAdminCanRejectSubmitted(app: Express): Promise<void> {
  const fieldToken = await login(app, "field@example.com");
  const managerToken = await login(app, "manager@example.com");
  const adminToken = await login(app, "admin@example.com");
  const managerTimesheet = await submitTimesheet(app, fieldToken, (await createTimesheet(app, fieldToken)).id);
  const adminTimesheet = await submitTimesheet(app, fieldToken, (await createTimesheet(app, fieldToken)).id);

  const managerRejection = await request(app)
    .post(`/timesheets/${managerTimesheet.id}/reject`)
    .set("Authorization", authorization(managerToken))
    .expect(200);

  const adminRejection = await request(app)
    .post(`/timesheets/${adminTimesheet.id}/reject`)
    .set("Authorization", authorization(adminToken))
    .expect(200);

  assert.equal(managerRejection.body.timesheet.status, "rejected");
  assert.equal(adminRejection.body.timesheet.status, "rejected");

  console.log("Manager and Admin can reject submitted timesheets");
}

async function testAuthenticatedUsersCanListAndRead(app: Express): Promise<void> {
  const fieldToken = await login(app, "field@example.com");
  const managerToken = await login(app, "manager@example.com");
  const timesheet = await createTimesheet(app, fieldToken);

  const fieldList = await request(app)
    .get("/timesheets")
    .set("Authorization", authorization(fieldToken))
    .expect(200);

  assert.ok(fieldList.body.timesheets.some((item: TimesheetRecord) => item.id === timesheet.id));

  const managerRead = await request(app)
    .get(`/timesheets/${timesheet.id}`)
    .set("Authorization", authorization(managerToken))
    .expect(200);

  assert.equal(managerRead.body.timesheet.id, timesheet.id);

  console.log("Authenticated Field Users can list own timesheets and managers can read all");
}

async function testInvalidStatusTransitionsBlocked(app: Express): Promise<void> {
  const fieldToken = await login(app, "field@example.com");
  const managerToken = await login(app, "manager@example.com");
  const approvedTimesheet = await submitTimesheet(app, fieldToken, (await createTimesheet(app, fieldToken)).id);

  await request(app)
    .post(`/timesheets/${approvedTimesheet.id}/approve`)
    .set("Authorization", authorization(managerToken))
    .expect(200);

  await request(app)
    .put(`/timesheets/${approvedTimesheet.id}`)
    .set("Authorization", authorization(fieldToken))
    .send({ regularHours: 6 })
    .expect(409);

  await request(app)
    .post(`/timesheets/${approvedTimesheet.id}/submit`)
    .set("Authorization", authorization(fieldToken))
    .expect(409);

  await request(app)
    .post(`/timesheets/${approvedTimesheet.id}/approve`)
    .set("Authorization", authorization(managerToken))
    .expect(409);

  await request(app)
    .post(`/timesheets/${approvedTimesheet.id}/reject`)
    .set("Authorization", authorization(managerToken))
    .expect(409);

  const rejectedTimesheet = await submitTimesheet(app, fieldToken, (await createTimesheet(app, fieldToken)).id);

  await request(app)
    .post(`/timesheets/${rejectedTimesheet.id}/reject`)
    .set("Authorization", authorization(managerToken))
    .expect(200);

  await request(app)
    .post(`/timesheets/${rejectedTimesheet.id}/approve`)
    .set("Authorization", authorization(managerToken))
    .expect(409);

  console.log("Invalid timesheet status transitions are blocked");
}

async function testValidationFailure(app: Express): Promise<void> {
  const fieldToken = await login(app, "field@example.com");
  const response = await request(app)
    .post("/timesheets")
    .set("Authorization", authorization(fieldToken))
    .send({ workDate: "not-a-date", regularHours: -1 })
    .expect(400);

  assert.equal(response.body.error, "Validation failed");
  assert.ok(response.body.errors.includes("projectId is required"));
  assert.ok(response.body.errors.includes("employeeId is required"));
  assert.ok(response.body.errors.includes("workDate must be a valid ISO date string"));
  assert.ok(response.body.errors.includes("regularHours must be greater than or equal to 0"));

  console.log("Timesheet validation failures return useful errors");
}

async function run(): Promise<void> {
  const app = createApp({
    authUserStore: await createTestUserStore(),
    timesheetStore: createInMemoryTimesheetStore(),
  });

  await testAnonymousAccessBlocked(app);
  await testFieldUserCanCreateOwnDraft(app);
  await testFieldUserCanEditOwnDraft(app);
  await testFieldUserCanSubmitOwnDraft(app);
  await testFieldUserCannotApproveOrReject(app);
  await testManagerAndAdminCanApproveSubmitted(app);
  await testManagerAndAdminCanRejectSubmitted(app);
  await testAuthenticatedUsersCanListAndRead(app);
  await testInvalidStatusTransitionsBlocked(app);
  await testValidationFailure(app);
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
