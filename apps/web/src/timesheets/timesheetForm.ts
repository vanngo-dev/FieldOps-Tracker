import type { TimesheetPayload, TimesheetRecord } from "../api/timesheetsClient";

export interface TimesheetFormValues {
  projectId: string;
  employeeId: string;
  workDate: string;
  regularHours: string;
  overtimeHours: string;
  notes: string;
}

export type TimesheetFormErrors = Partial<Record<keyof TimesheetFormValues, string>>;

export const defaultTimesheetFormValues: TimesheetFormValues = {
  projectId: "",
  employeeId: "",
  workDate: "",
  regularHours: "",
  overtimeHours: "",
  notes: "",
};

function toDateInput(value: string): string {
  return value.slice(0, 10);
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function dateInputToIso(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function readHours(value: string): number {
  return Number.parseFloat(value);
}

export function valuesFromTimesheet(timesheet: TimesheetRecord): TimesheetFormValues {
  return {
    projectId: timesheet.projectId,
    employeeId: timesheet.employeeId,
    workDate: toDateInput(timesheet.workDate),
    regularHours: String(timesheet.regularHours),
    overtimeHours: String(timesheet.overtimeHours),
    notes: timesheet.notes ?? "",
  };
}

export function validateTimesheetForm(values: TimesheetFormValues): TimesheetFormErrors {
  const errors: TimesheetFormErrors = {};
  const regularHours = readHours(values.regularHours);
  const overtimeHours = values.overtimeHours.trim() ? readHours(values.overtimeHours) : 0;

  if (!values.projectId.trim()) {
    errors.projectId = "Project ID is required.";
  }

  if (!values.employeeId.trim()) {
    errors.employeeId = "Employee ID is required.";
  }

  if (!values.workDate.trim()) {
    errors.workDate = "Work date is required.";
  }

  if (!values.regularHours.trim()) {
    errors.regularHours = "Regular hours are required.";
  } else if (!Number.isFinite(regularHours) || regularHours < 0) {
    errors.regularHours = "Regular hours must be 0 or greater.";
  }

  if (values.overtimeHours.trim() && (!Number.isFinite(overtimeHours) || overtimeHours < 0)) {
    errors.overtimeHours = "Overtime hours must be 0 or greater.";
  }

  if (
    !errors.regularHours
    && !errors.overtimeHours
    && Number.isFinite(regularHours)
    && Number.isFinite(overtimeHours)
    && regularHours + overtimeHours <= 0
  ) {
    errors.regularHours = "Total hours must be greater than 0.";
  }

  return errors;
}

export function hasTimesheetFormErrors(errors: TimesheetFormErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function toTimesheetPayload(values: TimesheetFormValues): TimesheetPayload {
  return {
    projectId: values.projectId.trim(),
    employeeId: values.employeeId.trim(),
    workDate: dateInputToIso(values.workDate),
    regularHours: readHours(values.regularHours),
    overtimeHours: values.overtimeHours.trim() ? readHours(values.overtimeHours) : 0,
    notes: blankToNull(values.notes),
  };
}
