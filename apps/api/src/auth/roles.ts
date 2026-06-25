export const roles = {
  admin: "admin",
  projectManager: "project_manager",
  fieldUser: "field_user",
} as const;

export type UserRole = (typeof roles)[keyof typeof roles];

export function isUserRole(value: unknown): value is UserRole {
  return value === roles.admin || value === roles.projectManager || value === roles.fieldUser;
}
