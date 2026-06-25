import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { getDatabaseConfig } from "../src/config/database";

const testDatabaseUrl =
  "sqlserver://localhost:1433;database=FieldOpsWorkflowTracker;user=sa;password=YourStrong!Passw0rd;encrypt=true;trustServerCertificate=true";

function testDatabaseConfig(): void {
  const config = getDatabaseConfig({ DATABASE_URL: testDatabaseUrl });

  assert.equal(config.provider, "sqlserver");
  assert.equal(config.url, testDatabaseUrl);
  assert.ok(existsSync(config.schemaPath));

  const schema = readFileSync(config.schemaPath, "utf8");

  assert.match(schema, /provider\s*=\s*"sqlserver"/);
  assert.match(schema, /model User/);
  assert.match(schema, /model Employee/);
  assert.match(schema, /model Project/);
  assert.match(schema, /model Timesheet/);
  assert.match(schema, /model FieldReport/);
  assert.match(schema, /model Asset/);
  assert.match(schema, /role\s+String/);
  assert.match(schema, /status\s+String\s+@default\("planned"\)/);
  assert.match(schema, /status\s+String\s+@default\("draft"\)/);
  assert.match(schema, /status\s+String\s+@default\("available"\)/);

  assert.throws(
    () => getDatabaseConfig({ DATABASE_URL: "postgresql://localhost/fieldops" }),
    /SQL Server connection string/,
  );

  console.log("Database config and Prisma schema load without a live SQL Server connection");
}

testDatabaseConfig();
