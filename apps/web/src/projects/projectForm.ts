import type { ProjectPayload, ProjectRecord, ProjectStatus } from "../api/projectsClient";

export interface ProjectFormValues {
  projectCode: string;
  name: string;
  projectManagerId: string;
  status: ProjectStatus;
  description: string;
  clientName: string;
  siteLocation: string;
  plannedStartDate: string;
  plannedEndDate: string;
}

export type ProjectFormErrors = Partial<Record<keyof ProjectFormValues, string>>;

export const defaultProjectFormValues: ProjectFormValues = {
  projectCode: "",
  name: "",
  projectManagerId: "",
  status: "planned",
  description: "",
  clientName: "",
  siteLocation: "",
  plannedStartDate: "",
  plannedEndDate: "",
};

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function dateInputToIso(value: string): string | null {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null;
}

export function valuesFromProject(project: ProjectRecord): ProjectFormValues {
  return {
    projectCode: project.projectCode,
    name: project.name,
    projectManagerId: project.projectManagerId,
    status: project.status,
    description: project.description ?? "",
    clientName: project.clientName ?? "",
    siteLocation: project.siteLocation ?? "",
    plannedStartDate: toDateInput(project.plannedStartDate),
    plannedEndDate: toDateInput(project.plannedEndDate),
  };
}

export function validateProjectForm(values: ProjectFormValues): ProjectFormErrors {
  const errors: ProjectFormErrors = {};

  if (!values.projectCode.trim()) {
    errors.projectCode = "Project code is required.";
  }

  if (!values.name.trim()) {
    errors.name = "Project name is required.";
  }

  if (!values.projectManagerId.trim()) {
    errors.projectManagerId = "Project manager ID is required.";
  }

  return errors;
}

export function hasProjectFormErrors(errors: ProjectFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function toProjectPayload(values: ProjectFormValues): ProjectPayload {
  return {
    projectCode: values.projectCode.trim(),
    name: values.name.trim(),
    projectManagerId: values.projectManagerId.trim(),
    status: values.status,
    description: blankToNull(values.description),
    clientName: blankToNull(values.clientName),
    siteLocation: blankToNull(values.siteLocation),
    plannedStartDate: dateInputToIso(values.plannedStartDate),
    plannedEndDate: dateInputToIso(values.plannedEndDate),
  };
}
