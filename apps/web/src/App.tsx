import { Navigate, NavLink, Route, Routes } from "react-router-dom";

import { AssetsPage } from "./pages/AssetsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { FieldReportsPage } from "./pages/FieldReportsPage";
import { LoginPage } from "./pages/LoginPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { TimesheetsPage } from "./pages/TimesheetsPage";

export const navigationItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Projects", path: "/projects" },
  { label: "Timesheets", path: "/timesheets" },
  { label: "Field Reports", path: "/field-reports" },
  { label: "Assets", path: "/assets" },
  { label: "Login", path: "/login" },
] as const;

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/timesheets" element={<TimesheetsPage />} />
      <Route path="/field-reports" element={<FieldReportsPage />} />
      <Route path="/assets" element={<AssetsPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">FieldOps</span>
          <h1>Workflow Tracker</h1>
        </div>
        <div className="header-meta">Phase-gated operations workspace</div>
      </header>

      <div className="workspace">
        <aside className="sidebar" aria-label="Primary navigation">
          <nav>
            {navigationItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="main-content">
          <AppRoutes />
        </main>
      </div>
    </div>
  );
}
