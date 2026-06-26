import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { createAuthController } from "../src/auth/AuthContext";
import type { AuthApiClient } from "../src/api/authClient";
import { App, getNavigationForRole, navigationItems } from "../src/App";
import type { ProjectRecord } from "../src/api/projectsClient";
import type { TimesheetRecord } from "../src/api/timesheetsClient";
import { createMemoryAuthStorage } from "../src/auth/storage";
import type { AuthSession } from "../src/auth/types";
import { canManageProjects, ProjectListView } from "../src/pages/ProjectsPage";
import {
  canCreateTimesheets,
  canReviewTimesheets,
  TimesheetListView,
  timesheetStatuses,
} from "../src/pages/TimesheetsPage";
import { defaultProjectFormValues, validateProjectForm } from "../src/projects/projectForm";
import { defaultTimesheetFormValues, validateTimesheetForm } from "../src/timesheets/timesheetForm";

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

const sampleProject: ProjectRecord = {
  id: "project-1",
  projectCode: "OPS-100",
  name: "North Yard Expansion",
  description: "Concrete and utility prep for the north yard.",
  clientName: "Contoso Construction",
  siteLocation: "Seattle, WA",
  projectManagerId: "user-manager",
  status: "active",
  plannedStartDate: "2026-06-01T00:00:00.000Z",
  plannedEndDate: "2026-08-30T00:00:00.000Z",
  actualStartDate: null,
  actualEndDate: null,
  createdAt: "2026-05-20T00:00:00.000Z",
  updatedAt: "2026-06-10T00:00:00.000Z",
};

const draftTimesheet: TimesheetRecord = {
  id: "timesheet-draft",
  projectId: "project-1",
  employeeId: "employee-field",
  submittedByUserId: "user-field",
  workDate: "2026-06-18T00:00:00.000Z",
  regularHours: 8,
  overtimeHours: 0,
  notes: "Foundation layout.",
  status: "draft",
  submittedAt: null,
  approvedAt: null,
  approvedByUserId: null,
  createdAt: "2026-06-18T01:00:00.000Z",
  updatedAt: "2026-06-18T01:00:00.000Z",
};

const submittedTimesheet: TimesheetRecord = {
  ...draftTimesheet,
  id: "timesheet-submitted",
  status: "submitted",
  submittedAt: "2026-06-18T20:00:00.000Z",
};

function renderPath(path: string, session: AuthSession | null = adminSession): string {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <App storage={createMemoryAuthStorage(session)} />
    </MemoryRouter>,
  );
}

const noopTimesheetAction = () => undefined;

function renderProjectList(canManage: boolean, options: Partial<Parameters<typeof ProjectListView>[0]> = {}): string {
  return renderToString(
    <MemoryRouter>
      <ProjectListView
        canManage={canManage}
        error={null}
        isLoading={false}
        projects={[sampleProject]}
        {...options}
      />
    </MemoryRouter>,
  );
}

function renderTimesheetList(
  role: "admin" | "project_manager" | "field_user",
  options: Partial<Parameters<typeof TimesheetListView>[0]> = {},
): string {
  return renderToString(
    <MemoryRouter>
      <TimesheetListView
        actionError={null}
        currentUserId={role === "field_user" ? "user-field" : "user-manager"}
        error={null}
        isActionPending={false}
        isLoading={false}
        onApproveTimesheet={noopTimesheetAction}
        onRejectTimesheet={noopTimesheetAction}
        onSubmitTimesheet={noopTimesheetAction}
        role={role}
        timesheets={[draftTimesheet, submittedTimesheet]}
        {...options}
      />
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
assert.deepEqual(fieldNavigation, ["Dashboard", "Projects", "Timesheets", "Field Reports"]);

const fieldMarkup = renderPath("/dashboard", fieldSession);

assert.match(fieldMarkup, /Projects/);
assert.match(fieldMarkup, /Timesheets/);
assert.doesNotMatch(fieldMarkup, /Assets/);

const projectsMarkup = renderProjectList(true);

assert.match(projectsMarkup, /North Yard Expansion/);
assert.match(projectsMarkup, /OPS-100/);
assert.match(projectsMarkup, /Active/);
assert.match(projectsMarkup, /Create project/);
assert.match(projectsMarkup, /Edit/);

const projectsLoadingMarkup = renderProjectList(true, { isLoading: true, projects: [] });

assert.match(projectsLoadingMarkup, /Loading projects/);

const projectsErrorMarkup = renderProjectList(true, { error: "Unable to load projects.", projects: [] });

assert.match(projectsErrorMarkup, /Unable to load projects/);

assert.equal(canManageProjects("admin"), true);
assert.equal(canManageProjects("project_manager"), true);
assert.equal(canManageProjects("field_user"), false);

const fieldProjectMarkup = renderProjectList(false);

assert.match(fieldProjectMarkup, /North Yard Expansion/);
assert.doesNotMatch(fieldProjectMarkup, /Create project/);
assert.doesNotMatch(fieldProjectMarkup, /Edit/);

const invalidProjectErrors = validateProjectForm(defaultProjectFormValues);

assert.equal(invalidProjectErrors.projectCode, "Project code is required.");
assert.equal(invalidProjectErrors.name, "Project name is required.");
assert.equal(invalidProjectErrors.projectManagerId, "Project manager ID is required.");

const validProjectErrors = validateProjectForm({
  ...defaultProjectFormValues,
  projectCode: "OPS-200",
  name: "South Yard Paving",
  projectManagerId: "user-manager",
});

assert.deepEqual(validProjectErrors, {});

const timesheetsMarkup = renderTimesheetList("field_user");

assert.match(timesheetsMarkup, /Timesheets/);
assert.match(timesheetsMarkup, /timesheet-draft/);
assert.match(timesheetsMarkup, /8.00 total/);

const timesheetsLoadingMarkup = renderTimesheetList("field_user", { isLoading: true, timesheets: [] });

assert.match(timesheetsLoadingMarkup, /Loading timesheets/);

const timesheetsErrorMarkup = renderTimesheetList("field_user", {
  error: "Unable to load timesheets.",
  timesheets: [],
});

assert.match(timesheetsErrorMarkup, /Unable to load timesheets/);

assert.equal(canCreateTimesheets("field_user"), true);
assert.equal(canCreateTimesheets("admin"), false);
assert.equal(canReviewTimesheets("admin"), true);
assert.equal(canReviewTimesheets("project_manager"), true);
assert.equal(canReviewTimesheets("field_user"), false);

assert.match(timesheetsMarkup, /Create timesheet/);
assert.match(timesheetsMarkup, /Submit/);
assert.doesNotMatch(timesheetsMarkup, /Approve/);
assert.doesNotMatch(timesheetsMarkup, /Reject/);

const managerTimesheetsMarkup = renderTimesheetList("project_manager");
const adminTimesheetsMarkup = renderTimesheetList("admin");

assert.match(managerTimesheetsMarkup, /Approve/);
assert.match(managerTimesheetsMarkup, /Reject/);
assert.match(adminTimesheetsMarkup, /Approve/);
assert.match(adminTimesheetsMarkup, /Reject/);

const statusBadgeMarkup = renderTimesheetList("admin", {
  timesheets: timesheetStatuses.map((status) => ({
    ...draftTimesheet,
    id: `timesheet-${status}`,
    status,
    submittedAt: status === "draft" ? null : "2026-06-18T20:00:00.000Z",
  })),
});

assert.match(statusBadgeMarkup, /Draft/);
assert.match(statusBadgeMarkup, /Submitted/);
assert.match(statusBadgeMarkup, /Approved/);
assert.match(statusBadgeMarkup, /Rejected/);

const invalidTimesheetErrors = validateTimesheetForm(defaultTimesheetFormValues);

assert.equal(invalidTimesheetErrors.projectId, "Project ID is required.");
assert.equal(invalidTimesheetErrors.employeeId, "Employee ID is required.");
assert.equal(invalidTimesheetErrors.workDate, "Work date is required.");
assert.equal(invalidTimesheetErrors.regularHours, "Regular hours are required.");

const validTimesheetErrors = validateTimesheetForm({
  ...defaultTimesheetFormValues,
  projectId: "project-1",
  employeeId: "employee-field",
  workDate: "2026-06-18",
  regularHours: "8",
});

assert.deepEqual(validTimesheetErrors, {});

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
