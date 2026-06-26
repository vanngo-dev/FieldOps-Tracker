import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  createTimesheetsApiClient,
  timesheetStatuses,
  type TimesheetRecord,
  type TimesheetStatus,
} from "../api/timesheetsClient";
import { useAuth } from "../auth/AuthContext";
import type { UserRole } from "../auth/types";
import {
  defaultTimesheetFormValues,
  hasTimesheetFormErrors,
  toTimesheetPayload,
  validateTimesheetForm,
  valuesFromTimesheet,
  type TimesheetFormErrors,
  type TimesheetFormValues,
} from "../timesheets/timesheetForm";

const statusLabels: Record<TimesheetStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
};

export function canCreateTimesheets(role: UserRole | null | undefined): boolean {
  return role === "field_user";
}

export function canReviewTimesheets(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "project_manager";
}

export function canEditTimesheet(
  role: UserRole | null | undefined,
  userId: string | null | undefined,
  timesheet: TimesheetRecord,
): boolean {
  return role === "field_user" && timesheet.submittedByUserId === userId && timesheet.status === "draft";
}

export function canSubmitTimesheet(
  role: UserRole | null | undefined,
  userId: string | null | undefined,
  timesheet: TimesheetRecord,
): boolean {
  return canEditTimesheet(role, userId, timesheet);
}

function formatStatus(status: TimesheetStatus): string {
  return statusLabels[status];
}

function formatDate(value: string | null): string {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatHours(timesheet: TimesheetRecord): string {
  const totalHours = timesheet.regularHours + timesheet.overtimeHours;

  return `${totalHours.toFixed(2)} total`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

interface TimesheetListViewProps {
  actionError: string | null;
  currentUserId: string | null;
  error: string | null;
  isActionPending: boolean;
  isLoading: boolean;
  onApproveTimesheet(id: string): void;
  onRejectTimesheet(id: string): void;
  onSubmitTimesheet(id: string): void;
  role: UserRole | null;
  timesheets: TimesheetRecord[];
}

export function TimesheetListView({
  actionError,
  currentUserId,
  error,
  isActionPending,
  isLoading,
  onApproveTimesheet,
  onRejectTimesheet,
  onSubmitTimesheet,
  role,
  timesheets,
}: TimesheetListViewProps) {
  const canCreate = canCreateTimesheets(role);
  const canReview = canReviewTimesheets(role);

  return (
    <section className="page-panel workflow-page">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">Labor</p>
          <h2>Timesheets</h2>
          <p>Submit draft labor hours and move submitted timesheets through approval review.</p>
        </div>
        {canCreate ? (
          <Link className="primary-action" to="/timesheets/new">
            Create timesheet
          </Link>
        ) : null}
      </div>

      {isLoading ? <p className="loading-state">Loading timesheets...</p> : null}
      {error ? <p className="error-banner" role="alert">{error}</p> : null}
      {actionError ? <p className="error-banner" role="alert">{actionError}</p> : null}

      {!isLoading && !error && timesheets.length === 0 ? (
        <p className="empty-state">No timesheets are available yet.</p>
      ) : null}

      {!isLoading && !error && timesheets.length > 0 ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Work date</th>
                <th scope="col">Project</th>
                <th scope="col">Employee</th>
                <th scope="col">Hours</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {timesheets.map((timesheet) => {
                const canEdit = canEditTimesheet(role, currentUserId, timesheet);
                const canSubmit = canSubmitTimesheet(role, currentUserId, timesheet);
                const canApproveReject = canReview && timesheet.status === "submitted";

                return (
                  <tr key={timesheet.id}>
                    <td>
                      {formatDate(timesheet.workDate)}
                      <span className="subtle-text">{timesheet.id}</span>
                    </td>
                    <td>{timesheet.projectId}</td>
                    <td>{timesheet.employeeId}</td>
                    <td>
                      {formatHours(timesheet)}
                      <span className="subtle-text">
                        {timesheet.regularHours.toFixed(2)} regular / {timesheet.overtimeHours.toFixed(2)} overtime
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill status-${timesheet.status}`}>
                        {formatStatus(timesheet.status)}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        {canEdit ? (
                          <Link className="secondary-link" to={`/timesheets/${timesheet.id}/edit`}>
                            Edit
                          </Link>
                        ) : null}
                        {canSubmit ? (
                          <button
                            className="inline-action"
                            type="button"
                            disabled={isActionPending}
                            onClick={() => onSubmitTimesheet(timesheet.id)}
                          >
                            Submit
                          </button>
                        ) : null}
                        {canApproveReject ? (
                          <>
                            <button
                              className="inline-action"
                              type="button"
                              disabled={isActionPending}
                              onClick={() => onApproveTimesheet(timesheet.id)}
                            >
                              Approve
                            </button>
                            <button
                              className="inline-action danger-action"
                              type="button"
                              disabled={isActionPending}
                              onClick={() => onRejectTimesheet(timesheet.id)}
                            >
                              Reject
                            </button>
                          </>
                        ) : null}
                        {!canEdit && !canSubmit && !canApproveReject ? (
                          <span className="subtle-text">No actions</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function useTimesheetClient() {
  const { token } = useAuth();

  return useMemo(() => (token ? createTimesheetsApiClient(token) : null), [token]);
}

export function TimesheetsPage() {
  const client = useTimesheetClient();
  const { user } = useAuth();
  const [timesheets, setTimesheets] = useState<TimesheetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);

  useEffect(() => {
    if (!client) {
      setError("Authentication is required to view timesheets.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    setIsLoading(true);
    setError(null);

    client.list()
      .then((nextTimesheets) => {
        if (isMounted) {
          setTimesheets(nextTimesheets);
        }
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setError(errorMessage(nextError));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [client]);

  function replaceTimesheet(nextTimesheet: TimesheetRecord) {
    setTimesheets((current) => current.map((timesheet) => (
      timesheet.id === nextTimesheet.id ? nextTimesheet : timesheet
    )));
  }

  async function runAction(action: (id: string) => Promise<TimesheetRecord>, id: string) {
    setIsActionPending(true);
    setActionError(null);

    try {
      replaceTimesheet(await action(id));
    } catch (nextError) {
      setActionError(errorMessage(nextError));
    } finally {
      setIsActionPending(false);
    }
  }

  return (
    <TimesheetListView
      actionError={actionError}
      currentUserId={user?.id ?? null}
      error={error}
      isActionPending={isActionPending}
      isLoading={isLoading}
      onApproveTimesheet={(id) => {
        if (client) {
          void runAction(client.approve, id);
        }
      }}
      onRejectTimesheet={(id) => {
        if (client) {
          void runAction(client.reject, id);
        }
      }}
      onSubmitTimesheet={(id) => {
        if (client) {
          void runAction(client.submit, id);
        }
      }}
      role={user?.role ?? null}
      timesheets={timesheets}
    />
  );
}

interface TimesheetFormProps {
  errors: TimesheetFormErrors;
  isSubmitting: boolean;
  onChange(field: keyof TimesheetFormValues, value: string): void;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
  submitError: string | null;
  submitLabel: string;
  values: TimesheetFormValues;
}

export function TimesheetForm({
  errors,
  isSubmitting,
  onChange,
  onSubmit,
  submitError,
  submitLabel,
  values,
}: TimesheetFormProps) {
  function handleChange(field: keyof TimesheetFormValues) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(field, event.target.value);
    };
  }

  return (
    <form className="project-form timesheet-form" noValidate onSubmit={onSubmit}>
      {submitError ? <p className="error-banner full-span" role="alert">{submitError}</p> : null}

      <label>
        Project ID
        <input
          aria-describedby={errors.projectId ? "timesheet-project-error" : undefined}
          value={values.projectId}
          onChange={handleChange("projectId")}
        />
        {errors.projectId ? <span id="timesheet-project-error" className="field-error">{errors.projectId}</span> : null}
      </label>

      <label>
        Employee ID
        <input
          aria-describedby={errors.employeeId ? "timesheet-employee-error" : undefined}
          value={values.employeeId}
          onChange={handleChange("employeeId")}
        />
        {errors.employeeId ? (
          <span id="timesheet-employee-error" className="field-error">{errors.employeeId}</span>
        ) : null}
      </label>

      <label>
        Work date
        <input
          aria-describedby={errors.workDate ? "timesheet-date-error" : undefined}
          type="date"
          value={values.workDate}
          onChange={handleChange("workDate")}
        />
        {errors.workDate ? <span id="timesheet-date-error" className="field-error">{errors.workDate}</span> : null}
      </label>

      <label>
        Regular hours
        <input
          aria-describedby={errors.regularHours ? "timesheet-regular-error" : undefined}
          min="0"
          step="0.25"
          type="number"
          value={values.regularHours}
          onChange={handleChange("regularHours")}
        />
        {errors.regularHours ? (
          <span id="timesheet-regular-error" className="field-error">{errors.regularHours}</span>
        ) : null}
      </label>

      <label>
        Overtime hours
        <input
          aria-describedby={errors.overtimeHours ? "timesheet-overtime-error" : undefined}
          min="0"
          step="0.25"
          type="number"
          value={values.overtimeHours}
          onChange={handleChange("overtimeHours")}
        />
        {errors.overtimeHours ? (
          <span id="timesheet-overtime-error" className="field-error">{errors.overtimeHours}</span>
        ) : null}
      </label>

      <label className="full-span">
        Notes
        <textarea rows={4} value={values.notes} onChange={handleChange("notes")} />
      </label>

      <div className="form-actions full-span">
        <button className="primary-action button-action" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        <Link className="secondary-link" to="/timesheets">
          Cancel
        </Link>
      </div>
    </form>
  );
}

interface TimesheetFormPageProps {
  errors: TimesheetFormErrors;
  isSubmitting: boolean;
  onChange(field: keyof TimesheetFormValues, value: string): void;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
  submitError: string | null;
  submitLabel: string;
  title: string;
  values: TimesheetFormValues;
}

function TimesheetFormPage({
  errors,
  isSubmitting,
  onChange,
  onSubmit,
  submitError,
  submitLabel,
  title,
  values,
}: TimesheetFormPageProps) {
  return (
    <section className="page-panel workflow-page">
      <Link className="secondary-link back-link" to="/timesheets">
        Back to timesheets
      </Link>
      <p className="eyebrow">Labor</p>
      <h2>{title}</h2>
      <TimesheetForm
        errors={errors}
        isSubmitting={isSubmitting}
        onChange={onChange}
        onSubmit={onSubmit}
        submitError={submitError}
        submitLabel={submitLabel}
        values={values}
      />
    </section>
  );
}

function ForbiddenTimesheetAction({ message }: { message: string }) {
  return (
    <section className="page-panel workflow-page">
      <Link className="secondary-link back-link" to="/timesheets">
        Back to timesheets
      </Link>
      <p className="eyebrow">Timesheets</p>
      <h2>Action unavailable</h2>
      <p>{message}</p>
    </section>
  );
}

function useTimesheetForm(initialValues: TimesheetFormValues) {
  const [values, setValues] = useState<TimesheetFormValues>(initialValues);
  const [errors, setErrors] = useState<TimesheetFormErrors>({});

  function handleChange(field: keyof TimesheetFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  return { errors, handleChange, setErrors, setValues, values };
}

export function TimesheetCreatePage() {
  const client = useTimesheetClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { errors, handleChange, setErrors, values } = useTimesheetForm(defaultTimesheetFormValues);

  if (!canCreateTimesheets(user?.role)) {
    return <ForbiddenTimesheetAction message="Timesheet creation is limited to Field User accounts." />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateTimesheetForm(values);

    setErrors(nextErrors);

    if (hasTimesheetFormErrors(nextErrors)) {
      return;
    }

    if (!client) {
      setSubmitError("Authentication is required to create timesheets.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await client.create(toTimesheetPayload(values));
      navigate("/timesheets");
    } catch (nextError) {
      setSubmitError(errorMessage(nextError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <TimesheetFormPage
      errors={errors}
      isSubmitting={isSubmitting}
      onChange={handleChange}
      onSubmit={handleSubmit}
      submitError={submitError}
      submitLabel="Create timesheet"
      title="Create Timesheet"
      values={values}
    />
  );
}

export function TimesheetEditPage() {
  const { id } = useParams();
  const client = useTimesheetClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadedTimesheet, setLoadedTimesheet] = useState<TimesheetRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { errors, handleChange, setErrors, setValues, values } = useTimesheetForm(defaultTimesheetFormValues);

  useEffect(() => {
    if (!client || !id) {
      setLoadError("Timesheet details are unavailable.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    setIsLoading(true);
    setLoadError(null);

    client.get(id)
      .then((timesheet) => {
        if (isMounted) {
          setLoadedTimesheet(timesheet);
          setValues(valuesFromTimesheet(timesheet));
        }
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setLoadError(errorMessage(nextError));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [client, id, setValues]);

  if (!canCreateTimesheets(user?.role)) {
    return <ForbiddenTimesheetAction message="Timesheet editing is limited to Field User accounts." />;
  }

  if (isLoading) {
    return (
      <section className="page-panel workflow-page">
        <p className="loading-state">Loading timesheet...</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="page-panel workflow-page">
        <Link className="secondary-link back-link" to="/timesheets">
          Back to timesheets
        </Link>
        <p className="error-banner" role="alert">{loadError}</p>
      </section>
    );
  }

  if (loadedTimesheet && !canEditTimesheet(user?.role, user?.id, loadedTimesheet)) {
    return <ForbiddenTimesheetAction message="Only your own draft timesheets can be edited." />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateTimesheetForm(values);

    setErrors(nextErrors);

    if (hasTimesheetFormErrors(nextErrors)) {
      return;
    }

    if (!client || !id) {
      setSubmitError("Timesheet details are unavailable.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await client.update(id, toTimesheetPayload(values));
      navigate("/timesheets");
    } catch (nextError) {
      setSubmitError(errorMessage(nextError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <TimesheetFormPage
      errors={errors}
      isSubmitting={isSubmitting}
      onChange={handleChange}
      onSubmit={handleSubmit}
      submitError={submitError}
      submitLabel="Save timesheet"
      title="Edit Timesheet"
      values={values}
    />
  );
}

export { timesheetStatuses };
