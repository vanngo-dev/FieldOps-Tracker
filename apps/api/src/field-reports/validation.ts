import type { CreateFieldReportInput, UpdateFieldReportInput } from "./types";

export interface ValidationResult<T> {
  value?: T;
  errors: string[];
}

type FieldReportBody = Record<string, unknown>;

function readRequiredString(body: FieldReportBody, field: string, errors: string[]): string | undefined {
  const value = body[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${field} is required`);
    return undefined;
  }

  return value.trim();
}

function readOptionalString(body: FieldReportBody, field: string, errors: string[]): string | null | undefined {
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

function readRequiredDate(body: FieldReportBody, field: string, errors: string[]): string | undefined {
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

function readOptionalDate(body: FieldReportBody, field: string, errors: string[]): string | undefined {
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

function readRequiredLaborCount(body: FieldReportBody, errors: string[]): number | undefined {
  const value = body.laborCount;

  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push("laborCount is required");
    return undefined;
  }

  if (!Number.isInteger(value) || value < 0) {
    errors.push("laborCount must be a whole number greater than or equal to 0");
    return undefined;
  }

  return value;
}

function readOptionalLaborCount(body: FieldReportBody, errors: string[]): number | undefined {
  if (!("laborCount" in body)) {
    return undefined;
  }

  const value = body.laborCount;

  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    errors.push("laborCount must be a whole number greater than or equal to 0");
    return undefined;
  }

  return value;
}

export function validateCreateFieldReport(
  body: unknown,
  authorUserId: string,
): ValidationResult<CreateFieldReportInput> {
  const errors: string[] = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { errors: ["request body must be an object"] };
  }

  const reportBody = body as FieldReportBody;
  const projectId = readRequiredString(reportBody, "projectId", errors);
  const reportDate = readRequiredDate(reportBody, "reportDate", errors);
  const laborCount = readRequiredLaborCount(reportBody, errors);
  const workCompleted = readRequiredString(reportBody, "workCompleted", errors);
  const blockers = readOptionalString(reportBody, "blockers", errors);
  const equipmentUsedNotes = readOptionalString(reportBody, "equipmentUsedNotes", errors);

  if (errors.length > 0 || !projectId || !reportDate || laborCount === undefined || !workCompleted) {
    return { errors };
  }

  return {
    value: {
      projectId,
      authorUserId,
      reportDate,
      laborCount,
      workCompleted,
      blockers,
      equipmentUsedNotes,
    },
    errors,
  };
}

export function validateUpdateFieldReport(body: unknown): ValidationResult<UpdateFieldReportInput> {
  const errors: string[] = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { errors: ["request body must be an object"] };
  }

  const reportBody = body as FieldReportBody;
  const input: UpdateFieldReportInput = {};

  for (const field of ["projectId", "workCompleted"] as const) {
    if (field in reportBody) {
      const value = readRequiredString(reportBody, field, errors);

      if (value) {
        input[field] = value;
      }
    }
  }

  const reportDate = readOptionalDate(reportBody, "reportDate", errors);

  if (reportDate) {
    input.reportDate = reportDate;
  }

  const laborCount = readOptionalLaborCount(reportBody, errors);

  if (laborCount !== undefined) {
    input.laborCount = laborCount;
  }

  for (const field of ["blockers", "equipmentUsedNotes"] as const) {
    const value = readOptionalString(reportBody, field, errors);

    if (value !== undefined) {
      input[field] = value;
    }
  }

  if (errors.length === 0 && Object.keys(input).length === 0) {
    errors.push("at least one field report field is required");
  }

  return errors.length > 0 ? { errors } : { value: input, errors };
}
