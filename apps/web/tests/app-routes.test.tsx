import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { App, navigationItems } from "../src/App";

const originalConsoleError = console.error;

console.error = (...args: unknown[]) => {
  const [message] = args;

  if (typeof message === "string" && message.includes("useLayoutEffect does nothing on the server")) {
    return;
  }

  originalConsoleError(...args);
};

const routeExpectations = [
  { path: "/login", text: "Login" },
  { path: "/dashboard", text: "Dashboard" },
  { path: "/projects", text: "Projects" },
  { path: "/timesheets", text: "Timesheets" },
  { path: "/field-reports", text: "Field Reports" },
  { path: "/assets", text: "Assets" },
];

function renderPath(path: string): string {
  return renderToString(
    <MemoryRouter initialEntries={[path]}>
      <App />
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

console.log("Frontend layout renders and placeholder routes are available");
