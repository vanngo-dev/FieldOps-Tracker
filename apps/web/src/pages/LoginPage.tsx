import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Password123!");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
    } catch {
      setError("Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page-panel">
      <p className="eyebrow">Access</p>
      <h2>Login</h2>
      <form className="login-form" onSubmit={handleSubmit}>
        <label>
          Email
          <input
            autoComplete="email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in" : "Sign in"}
        </button>
      </form>
    </section>
  );
}
