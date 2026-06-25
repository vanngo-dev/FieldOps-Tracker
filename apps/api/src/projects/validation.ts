import { projectStatuses, type CreateProjectInput, type ProjectStatus, type UpdateProjectInput } from "./types";

export interface ValidationResult<T> {
  value?: T;
  errors: string[];
}

const optionalStringFields = ["description", "clientName", "siteLocation"] as const;
const dateFields = ["plannedStartDate", "plannedEndDate", "actualStartDate", "actualEndDate"] as const;

type ProjectBody = Record<string, unknown>;

function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === "string" && projectStatuses.includes(value as ProjectStatus);
}

function readRequiredString(body: ProjectBody, field: string, errors: string[]): string | undefined {
  const value = body[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${field} is required`);
    return undefined;
  }

  return value.trim();
}

function readOptionalString(body: ProjectBody, field: string, errors: string[]): string | null | undefined {
  if (!(field in body)) {
    return undefined;
  }

  const value = body[field];

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    errors.push(`${field} must be a string or null`);
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function readOptionalDate(body: ProjectBody, field: string, errors: string[]): string | null | undefined {
  if (!(field in body)) {
    return undefined;
  }

  const value = body[field];

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    errors.push(`${field} must be an ISO date string or null`);
    return undefined;
  }

  const time = Date.parse(value);

  if (Number.isNaN(time)) {
    errors.push(`${field} must be a valid ISO date string`);
    return undefined;
  }

  return new Date(time).toISOString();
}

function applyOptionalFields<T extends UpdateProjectInput>(
  body: ProjectBody,
  input: T,
  errors: string[],
): T {
  for (const field of optionalStringFields) {
    const value = readOptionalString(body, field, errors);

    if (value !== undefined) {
      input[field] = value;
    }
  }

  for (const field of dateFields) {
    const value = readOptionalDate(body, field, errors);

    if (value !== undefined) {
      input[field] = value;
    }
  }

  if ("status" in body) {
    if (isProjectStatus(body.status)) {
      input.status = body.status;
    } else {
      errors.push(`status must be one of: ${projectStatuses.join(", ")}`);
    }
  }

  return input;
}

export function validateCreateProject(body: unknown): ValidationResult<CreateProjectInput> {
  const errors: string[] = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { errors: ["request body must be an object"] };
  }

  const projectBody = body as ProjectBody;
  const projectCode = readRequiredString(projectBody, "projectCode", errors);
  const name = readRequiredString(projectBody, "name", errors);
  const projectManagerId = readRequiredString(projectBody, "projectManagerId", errors);
  const input = applyOptionalFields(projectBody, {} as CreateProjectInput, errors);

  if (projectCode) {
    input.projectCode = projectCode;
  }

  if (name) {
    input.name = name;
  }

  if (projectManagerId) {
    input.projectManagerId = projectManagerId;
  }

  return errors.length > 0 ? { errors } : { value: input, errors };
}

export function validateUpdateProject(body: unknown): ValidationResult<UpdateProjectInput> {
  const errors: string[] = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { errors: ["request body must be an object"] };
  }

  const projectBody = body as ProjectBody;
  const input = applyOptionalFields(projectBody, {} as UpdateProjectInput, errors);

  for (const field of ["projectCode", "name", "projectManagerId"] as const) {
    if (field in projectBody) {
      const value = readRequiredString(projectBody, field, errors);

      if (value) {
        input[field] = value;
      }
    }
  }

  if (errors.length === 0 && Object.keys(input).length === 0) {
    errors.push("at least one project field is required");
  }

  return errors.length > 0 ? { errors } : { value: input, errors };
}
