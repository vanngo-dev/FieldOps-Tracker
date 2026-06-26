import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { createAuthController } from "../src/auth/AuthContext";
import type { AuthApiClient } from "../src/api/authClient";
import { App, getNavigationForRole, navigationItems } from "../src/App";
import { createMemoryAuthStorage } from "../src/auth/storage";
import type { AuthSession } from "../src/auth/types";

const originalConsoleError = console.error;

console.error = (...args: unknown[]) => {
  const [message] = args;

  if (typeof message === "string" && message.includes("useLayoutEffect does nothing on the server")) {
    return;
  }

  originalConsoleError(...args);
};

const routeExpectations = [
  { path: "/dashboard", text: "Dashboard" },
  { path: "/projects", text: "Projects" },
  { path: "/timesheets", text: "Timesheets" },
  { path: "/field-reports", text: "Field Reports" },
  { path: "/assets", text: "Assets" },
];

const adminSession: AuthSession = {
  token: "admin-token",
  user: {
    id: "user-admin",
    name: "FieldOps Admin",
    email: "admin@example.com",
    role: "admin",
  },
};

const fieldSession: AuthSession = {
  token: "field-token",
  user: {
    id: "user-field",
    name: "Field User",
    email: "field@example.com",
    role: "field_user",
  },
};

function renderPath(path: string, session: AuthSession | null = adminSession): string {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <App storage={createMemoryAuthStorage(session)} />
    </MemoryRouter>,
  );
}

for (const item of navigationItems) {
  assert.equal(typeof item.label, "string");
  assert.ok(item.path.startsWith("/"));
}

const dashboardMarkup = renderPath("/dashboard");

assert.match(dashboardMarkup, /Workflow Tracker/);
assert.match(dashboardMarkup, /Primary navigation/);
assert.match(dashboardMarkup, /Dashboard/);

for (const route of routeExpectations) {
  const markup = renderPath(route.path);

  assert.match(markup, new RegExp(route.text));
}

const loginMarkup = renderPath("/login", null);

assert.match(loginMarkup, /Email/);
assert.match(loginMarkup, /Password/);
assert.match(loginMarkup, /Sign in/);

const anonymousDashboardMarkup = renderPath("/dashboard", null);

assert.match(anonymousDashboardMarkup, /Login required/);

const adminNavigation = getNavigationForRole("admin").map((item) => item.label);
const managerNavigation = getNavigationForRole("project_manager").map((item) => item.label);
const fieldNavigation = getNavigationForRole("field_user").map((item) => item.label);

assert.deepEqual(adminNavigation, ["Dashboard", "Projects", "Timesheets", "Field Reports", "Assets"]);
assert.deepEqual(managerNavigation, ["Dashboard", "Projects", "Timesheets", "Field Reports", "Assets"]);
assert.deepEqual(fieldNavigation, ["Dashboard", "Timesheets", "Field Reports"]);

const fieldMarkup = renderPath("/dashboard", fieldSession);

assert.match(fieldMarkup, /Timesheets/);
assert.doesNotMatch(fieldMarkup, /Assets/);

async function testAuthController(): Promise<void> {
  const successfulLoginSession: AuthSession = {
    token: "stored-token",
    user: {
      id: "user-manager",
      name: "Project Manager",
      email: "manager@example.com",
      role: "project_manager",
    },
  };
  const storage = createMemoryAuthStorage();
  let currentSession: AuthSession | null = null;
  const apiClient: AuthApiClient = {
    async login() {
      return successfulLoginSession;
    },
  };
  const controller = createAuthController(apiClient, storage, (nextSession) => {
    currentSession = nextSession;
  });

  await controller.login({ email: "manager@example.com", password: "Password123!" });

  assert.deepEqual(storage.load(), successfulLoginSession);
  assert.deepEqual(currentSession, successfulLoginSession);

  controller.logout();

  assert.equal(storage.load(), null);
  assert.equal(currentSession, null);
}

testAuthController()
  .then(() => {
    console.log("Frontend auth flow, protected routes, and role navigation are available");
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
