export type UserRole = "admin" | "project_manager" | "field_user";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
