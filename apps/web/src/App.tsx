import { Navigate, NavLink, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth, type AuthProviderProps } from "./auth/AuthContext";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import type { UserRole } from "./auth/types";
import { AssetsPage } from "./pages/AssetsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { FieldReportsPage } from "./pages/FieldReportsPage";
import { LoginPage } from "./pages/LoginPage";
import { ProjectCreatePage, ProjectDetailPage, ProjectEditPage, ProjectsPage } from "./pages/ProjectsPage";
import { TimesheetCreatePage, TimesheetEditPage, TimesheetsPage } from "./pages/TimesheetsPage";

interface NavigationItem {
  label: string;
  path: string;
  roles: readonly UserRole[];
}

export const navigationItems: readonly NavigationItem[] = [
  { label: "Dashboard", path: "/dashboard", roles: ["admin", "project_manager", "field_user"] },
  { label: "Projects", path: "/projects", roles: ["admin", "project_manager", "field_user"] },
  { label: "Timesheets", path: "/timesheets", roles: ["admin", "project_manager", "field_user"] },
  { label: "Field Reports", path: "/field-reports", roles: ["admin", "project_manager", "field_user"] },
  { label: "Assets", path: "/assets", roles: ["admin", "project_manager"] },
];

export function getNavigationForRole(role: UserRole | null) {
  if (!role) {
    return [];
  }

  return navigationItems.filter((item) => item.roles.includes(role));
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
      <Route path="/projects/new" element={<ProtectedRoute><ProjectCreatePage /></ProtectedRoute>} />
      <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetailPage /></ProtectedRoute>} />
      <Route path="/projects/:id/edit" element={<ProtectedRoute><ProjectEditPage /></ProtectedRoute>} />
      <Route path="/timesheets" element={<ProtectedRoute><TimesheetsPage /></ProtectedRoute>} />
      <Route path="/timesheets/new" element={<ProtectedRoute><TimesheetCreatePage /></ProtectedRoute>} />
      <Route path="/timesheets/:id/edit" element={<ProtectedRoute><TimesheetEditPage /></ProtectedRoute>} />
      <Route path="/field-reports" element={<ProtectedRoute><FieldReportsPage /></ProtectedRoute>} />
      <Route path="/assets" element={<ProtectedRoute><AssetsPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function AppShell() {
  const { isAuthenticated, logout, user } = useAuth();
  const visibleNavigation = getNavigationForRole(user?.role ?? null);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">FieldOps</span>
          <h1>Workflow Tracker</h1>
        </div>
        <div className="header-actions">
          {isAuthenticated && user ? (
            <>
              <span className="header-meta">{user.name} · {user.role}</span>
              <button className="text-button" type="button" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <span className="header-meta">Phase-gated operations workspace</span>
          )}
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar" aria-label="Primary navigation">
          <nav>
            {isAuthenticated ? (
              visibleNavigation.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                >
                  {item.label}
                </NavLink>
              ))
            ) : (
              <NavLink
                to="/login"
                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              >
                Login
              </NavLink>
            )}
          </nav>
        </aside>

        <main className="main-content">
          <AppRoutes />
        </main>
      </div>
    </div>
  );
}

export function App(authProviderProps: Omit<AuthProviderProps, "children"> = {}) {
  return (
    <AuthProvider {...authProviderProps}>
      <AppShell />
    </AuthProvider>
  );
}
