import type { UserRole } from "./roles";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginUserRecord extends AuthenticatedUser {
  passwordHash: string;
  status: string;
}

export interface AuthUserStore {
  findByEmail(email: string): Promise<LoginUserRecord | null>;
}
