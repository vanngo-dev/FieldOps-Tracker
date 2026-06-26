import { Link } from "react-router-dom";

import { useAuth } from "./AuthContext";

interface ProtectedRouteProps {
  children: JSX.Element;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <section className="page-panel">
        <p className="eyebrow">Protected</p>
        <h2>Login required</h2>
        <p>
          Sign in to access FieldOps workspace pages. <Link to="/login">Go to login</Link>.
        </p>
      </section>
    );
  }

  return children;
}
