import { assetStatuses, type AssetStatus, type CreateAssetInput, type UpdateAssetInput } from "./types";

export interface ValidationResult<T> {
  value?: T;
  errors: string[];
}

type AssetBody = Record<string, unknown>;

function isAssetStatus(value: unknown): value is AssetStatus {
  return typeof value === "string" && assetStatuses.includes(value as AssetStatus);
}

function readRequiredString(body: AssetBody, field: string, errors: string[]): string | undefined {
  const value = body[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${field} is required`);
    return undefined;
  }

  return value.trim();
}

function readOptionalString(body: AssetBody, field: string, errors: string[]): string | null | undefined {
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

function readRequiredStatus(body: AssetBody, errors: string[]): AssetStatus | undefined {
  if (!isAssetStatus(body.status)) {
    errors.push(`status must be one of: ${assetStatuses.join(", ")}`);
    return undefined;
  }

  return body.status;
}

function readOptionalStatus(body: AssetBody, errors: string[]): AssetStatus | undefined {
  if (!("status" in body)) {
    return undefined;
  }

  if (!isAssetStatus(body.status)) {
    errors.push(`status must be one of: ${assetStatuses.join(", ")}`);
    return undefined;
  }

  return body.status;
}

export function validateCreateAsset(body: unknown): ValidationResult<CreateAssetInput> {
  const errors: string[] = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { errors: ["request body must be an object"] };
  }

  const assetBody = body as AssetBody;
  const name = readRequiredString(assetBody, "name", errors);
  const assetTag = readRequiredString(assetBody, "assetTag", errors);
  const status = readRequiredStatus(assetBody, errors);
  const assetType = readOptionalString(assetBody, "assetType", errors);
  const assignedProjectId = readOptionalString(assetBody, "assignedProjectId", errors);

  if (errors.length > 0 || !name || !assetTag || !status) {
    return { errors };
  }

  return {
    value: {
      name,
      assetTag,
      status,
      assetType: assetType ?? undefined,
      assignedProjectId,
    },
    errors,
  };
}

export function validateUpdateAsset(body: unknown): ValidationResult<UpdateAssetInput> {
  const errors: string[] = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { errors: ["request body must be an object"] };
  }

  const assetBody = body as AssetBody;
  const input: UpdateAssetInput = {};

  for (const field of ["name", "assetTag", "assetType"] as const) {
    if (field in assetBody) {
      const value = readRequiredString(assetBody, field, errors);

      if (value !== undefined) {
        input[field] = value;
      }
    }
  }

  const assignedProjectId = readOptionalString(assetBody, "assignedProjectId", errors);

  if (assignedProjectId !== undefined) {
    input.assignedProjectId = assignedProjectId;
  }

  const status = readOptionalStatus(assetBody, errors);

  if (status) {
    input.status = status;
  }

  if (errors.length === 0 && Object.keys(input).length === 0) {
    errors.push("at least one asset field is required");
  }

  return errors.length > 0 ? { errors } : { value: input, errors };
}

export function validateAssignAsset(body: unknown): ValidationResult<{ projectId: string }> {
  const errors: string[] = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { errors: ["request body must be an object"] };
  }

  const projectId = readRequiredString(body as AssetBody, "projectId", errors);

  return errors.length > 0 || !projectId ? { errors } : { value: { projectId }, errors };
}
