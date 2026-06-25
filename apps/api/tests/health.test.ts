import assert from "node:assert/strict";
import request from "supertest";

import { app } from "../src/app";

async function testHealthEndpoint(): Promise<void> {
  const response = await request(app).get("/health").expect(200);

  assert.deepEqual(response.body, { status: "ok" });
  console.log("GET /health returns { status: \"ok\" }");
}

testHealthEndpoint().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
