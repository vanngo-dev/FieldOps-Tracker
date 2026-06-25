import type { CreateTimesheetInput, UpdateTimesheetInput } from "./types";

export interface ValidationResult<T> {
  value?: T;
  errors: string[];
}

type TimesheetBody = Record<string, unknown>;

function readRequiredString(body: TimesheetBody, field: string, errors: string[]): string | undefined {
  const value = body[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${field} is required`);
    return undefined;
  }

  return value.trim();
}

function readOptionalString(body: TimesheetBody, field: string, errors: string[]): string | null | undefined {
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

function readRequiredDate(body: TimesheetBody, field: string, errors: string[]): string | undefined {
  const value = readRequiredString(body, field, errors);

  if (!value) {
    return undefined;
  }

  const time = Date.parse(value);

  if (Number.isNaN(time)) {
    errors.push(`${field} must be a valid ISO date string`);
    return undefined;
  }

  return new Date(time).toISOString();
}

function readOptionalDate(body: TimesheetBody, field: string, errors: string[]): string | undefined {
  if (!(field in body)) {
    return undefined;
  }

  const value = body[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${field} must be a valid ISO date string`);
    return undefined;
  }

  const time = Date.parse(value);

  if (Number.isNaN(time)) {
    errors.push(`${field} must be a valid ISO date string`);
    return undefined;
  }

  return new Date(time).toISOString();
}

function readRequiredHours(body: TimesheetBody, field: string, errors: string[]): number | undefined {
  const value = body[field];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${field} is required`);
    return undefined;
  }

  if (value < 0) {
    errors.push(`${field} must be greater than or equal to 0`);
    return undefined;
  }

  return value;
}

function readOptionalHours(body: TimesheetBody, field: string, errors: string[]): number | undefined {
  if (!(field in body)) {
    return undefined;
  }

  const value = body[field];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${field} must be a number`);
    return undefined;
  }

  if (value < 0) {
    errors.push(`${field} must be greater than or equal to 0`);
    return undefined;
  }

  return value;
}

export function validateCreateTimesheet(
  body: unknown,
  submittedByUserId: string,
): ValidationResult<CreateTimesheetInput> {
  const errors: string[] = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { errors: ["request body must be an object"] };
  }

  const timesheetBody = body as TimesheetBody;
  const projectId = readRequiredString(timesheetBody, "projectId", errors);
  const employeeId = readRequiredString(timesheetBody, "employeeId", errors);
  const workDate = readRequiredDate(timesheetBody, "workDate", errors);
  const regularHours = readRequiredHours(timesheetBody, "regularHours", errors);
  const overtimeHours = readOptionalHours(timesheetBody, "overtimeHours", errors);
  const notes = readOptionalString(timesheetBody, "notes", errors);

  if (regularHours !== undefined && regularHours + (overtimeHours ?? 0) <= 0) {
    errors.push("total hours must be greater than 0");
  }

  if (errors.length > 0 || !projectId || !employeeId || !workDate || regularHours === undefined) {
    return { errors };
  }

  return {
    value: {
      projectId,
      employeeId,
      submittedByUserId,
      workDate,
      regularHours,
      overtimeHours,
      notes,
    },
    errors,
  };
}

export function validateUpdateTimesheet(body: unknown): ValidationResult<UpdateTimesheetInput> {
  const errors: string[] = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { errors: ["request body must be an object"] };
  }

  const timesheetBody = body as TimesheetBody;
  const input: UpdateTimesheetInput = {};

  for (const field of ["projectId", "employeeId"] as const) {
    if (field in timesheetBody) {
      const value = readRequiredString(timesheetBody, field, errors);

      if (value) {
        input[field] = value;
      }
    }
  }

  const workDate = readOptionalDate(timesheetBody, "workDate", errors);

  if (workDate) {
    input.workDate = workDate;
  }

  for (const field of ["regularHours", "overtimeHours"] as const) {
    const value = readOptionalHours(timesheetBody, field, errors);

    if (value !== undefined) {
      input[field] = value;
    }
  }

  const notes = readOptionalString(timesheetBody, "notes", errors);

  if (notes !== undefined) {
    input.notes = notes;
  }

  if (errors.length === 0 && Object.keys(input).length === 0) {
    errors.push("at least one timesheet field is required");
  }

  return errors.length > 0 ? { errors } : { value: input, errors };
}
