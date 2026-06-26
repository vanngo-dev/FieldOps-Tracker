import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  createProjectsApiClient,
  projectStatuses,
  type ProjectRecord,
  type ProjectStatus,
} from "../api/projectsClient";
import { useAuth } from "../auth/AuthContext";
import type { UserRole } from "../auth/types";
import {
  defaultProjectFormValues,
  hasProjectFormErrors,
  toProjectPayload,
  validateProjectForm,
  valuesFromProject,
  type ProjectFormErrors,
  type ProjectFormValues,
} from "../projects/projectForm";

const statusLabels: Record<ProjectStatus, string> = {
  planned: "Planned",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function canManageProjects(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "project_manager";
}

function formatStatus(status: ProjectStatus): string {
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

interface ProjectListViewProps {
  canManage: boolean;
  error: string | null;
  isLoading: boolean;
  projects: ProjectRecord[];
}

export function ProjectListView({ canManage, error, isLoading, projects }: ProjectListViewProps) {
  return (
    <section className="page-panel project-page">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">Jobsites</p>
          <h2>Projects</h2>
          <p>Track active jobsites, ownership, schedule windows, and field-ready status.</p>
        </div>
        {canManage ? (
          <Link className="primary-action" to="/projects/new">
            Create project
          </Link>
        ) : null}
      </div>

      {isLoading ? <p className="loading-state">Loading projects...</p> : null}
      {error ? <p className="error-banner" role="alert">{error}</p> : null}

      {!isLoading && !error && projects.length === 0 ? (
        <p className="empty-state">No projects are available yet.</p>
      ) : null}

      {!isLoading && !error && projects.length > 0 ? (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col">Status</th>
                <th scope="col">Client</th>
                <th scope="col">Site</th>
                <th scope="col">Planned start</th>
                {canManage ? <th scope="col">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <Link className="record-link" to={`/projects/${project.id}`}>
                      {project.name}
                    </Link>
                    <span className="subtle-text">{project.projectCode}</span>
                  </td>
                  <td>
                    <span className={`status-pill status-${project.status.replace("_", "-")}`}>
                      {formatStatus(project.status)}
                    </span>
                  </td>
                  <td>{project.clientName ?? "Not set"}</td>
                  <td>{project.siteLocation ?? "Not set"}</td>
                  <td>{formatDate(project.plannedStartDate)}</td>
                  {canManage ? (
                    <td>
                      <Link className="secondary-link" to={`/projects/${project.id}/edit`}>
                        Edit
                      </Link>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function useProjectClient() {
  const { token } = useAuth();

  return useMemo(() => (token ? createProjectsApiClient(token) : null), [token]);
}

export function ProjectsPage() {
  const client = useProjectClient();
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) {
      setError("Authentication is required to view projects.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    setIsLoading(true);
    setError(null);

    client.list()
      .then((nextProjects) => {
        if (isMounted) {
          setProjects(nextProjects);
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

  return (
    <ProjectListView
      canManage={canManageProjects(user?.role)}
      error={error}
      isLoading={isLoading}
      projects={projects}
    />
  );
}

interface ProjectDetailViewProps {
  canManage: boolean;
  error: string | null;
  isLoading: boolean;
  project: ProjectRecord | null;
}

function ProjectDetailView({ canManage, error, isLoading, project }: ProjectDetailViewProps) {
  return (
    <section className="page-panel project-page">
      <Link className="secondary-link back-link" to="/projects">
        Back to projects
      </Link>

      {isLoading ? <p className="loading-state">Loading project...</p> : null}
      {error ? <p className="error-banner" role="alert">{error}</p> : null}

      {!isLoading && !error && project ? (
        <>
          <div className="page-toolbar">
            <div>
              <p className="eyebrow">{project.projectCode}</p>
              <h2>{project.name}</h2>
              <p>{project.description ?? "No description has been added."}</p>
            </div>
            {canManage ? (
              <Link className="primary-action" to={`/projects/${project.id}/edit`}>
                Edit project
              </Link>
            ) : null}
          </div>

          <dl className="detail-grid">
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`status-pill status-${project.status.replace("_", "-")}`}>
                  {formatStatus(project.status)}
                </span>
              </dd>
            </div>
            <div>
              <dt>Client</dt>
              <dd>{project.clientName ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Site</dt>
              <dd>{project.siteLocation ?? "Not set"}</dd>
            </div>
            <div>
              <dt>Project Manager ID</dt>
              <dd>{project.projectManagerId}</dd>
            </div>
            <div>
              <dt>Planned Start</dt>
              <dd>{formatDate(project.plannedStartDate)}</dd>
            </div>
            <div>
              <dt>Planned End</dt>
              <dd>{formatDate(project.plannedEndDate)}</dd>
            </div>
          </dl>
        </>
      ) : null}
    </section>
  );
}

export function ProjectDetailPage() {
  const { id } = useParams();
  const client = useProjectClient();
  const { user } = useAuth();
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client || !id) {
      setError("Project details are unavailable.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    setIsLoading(true);
    setError(null);

    client.get(id)
      .then((nextProject) => {
        if (isMounted) {
          setProject(nextProject);
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
  }, [client, id]);

  return (
    <ProjectDetailView
      canManage={canManageProjects(user?.role)}
      error={error}
      isLoading={isLoading}
      project={project}
    />
  );
}

interface ProjectFormProps {
  errors: ProjectFormErrors;
  isSubmitting: boolean;
  onChange(field: keyof ProjectFormValues, value: string): void;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
  submitError: string | null;
  submitLabel: string;
  values: ProjectFormValues;
}

export function ProjectForm({
  errors,
  isSubmitting,
  onChange,
  onSubmit,
  submitError,
  submitLabel,
  values,
}: ProjectFormProps) {
  function handleChange(field: keyof ProjectFormValues) {
    return (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      onChange(field, event.target.value);
    };
  }

  return (
    <form className="project-form" noValidate onSubmit={onSubmit}>
      {submitError ? <p className="error-banner" role="alert">{submitError}</p> : null}

      <label>
        Project code
        <input
          aria-describedby={errors.projectCode ? "project-code-error" : undefined}
          value={values.projectCode}
          onChange={handleChange("projectCode")}
        />
        {errors.projectCode ? <span id="project-code-error" className="field-error">{errors.projectCode}</span> : null}
      </label>

      <label>
        Project name
        <input
          aria-describedby={errors.name ? "project-name-error" : undefined}
          value={values.name}
          onChange={handleChange("name")}
        />
        {errors.name ? <span id="project-name-error" className="field-error">{errors.name}</span> : null}
      </label>

      <label>
        Project manager ID
        <input
          aria-describedby={errors.projectManagerId ? "project-manager-error" : undefined}
          value={values.projectManagerId}
          onChange={handleChange("projectManagerId")}
        />
        {errors.projectManagerId ? (
          <span id="project-manager-error" className="field-error">{errors.projectManagerId}</span>
        ) : null}
      </label>

      <label>
        Status
        <select value={values.status} onChange={handleChange("status")}>
          {projectStatuses.map((status) => (
            <option key={status} value={status}>
              {formatStatus(status)}
            </option>
          ))}
        </select>
      </label>

      <label>
        Client
        <input value={values.clientName} onChange={handleChange("clientName")} />
      </label>

      <label>
        Site location
        <input value={values.siteLocation} onChange={handleChange("siteLocation")} />
      </label>

      <label>
        Planned start
        <input type="date" value={values.plannedStartDate} onChange={handleChange("plannedStartDate")} />
      </label>

      <label>
        Planned end
        <input type="date" value={values.plannedEndDate} onChange={handleChange("plannedEndDate")} />
      </label>

      <label className="full-span">
        Description
        <textarea rows={4} value={values.description} onChange={handleChange("description")} />
      </label>

      <div className="form-actions full-span">
        <button className="primary-action button-action" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
        <Link className="secondary-link" to="/projects">
          Cancel
        </Link>
      </div>
    </form>
  );
}

interface ProjectFormPageProps {
  errors: ProjectFormErrors;
  isSubmitting: boolean;
  onChange(field: keyof ProjectFormValues, value: string): void;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
  submitError: string | null;
  submitLabel: string;
  title: string;
  values: ProjectFormValues;
}

function ProjectFormPage({
  errors,
  isSubmitting,
  onChange,
  onSubmit,
  submitError,
  submitLabel,
  title,
  values,
}: ProjectFormPageProps) {
  return (
    <section className="page-panel project-page">
      <Link className="secondary-link back-link" to="/projects">
        Back to projects
      </Link>
      <p className="eyebrow">Jobsites</p>
      <h2>{title}</h2>
      <ProjectForm
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

function ForbiddenProjectAction() {
  return (
    <section className="page-panel project-page">
      <Link className="secondary-link back-link" to="/projects">
        Back to projects
      </Link>
      <p className="eyebrow">Projects</p>
      <h2>View-only access</h2>
      <p>Project create and edit actions are limited to Admin and Project Manager roles.</p>
    </section>
  );
}

function useProjectForm(initialValues: ProjectFormValues) {
  const [values, setValues] = useState<ProjectFormValues>(initialValues);
  const [errors, setErrors] = useState<ProjectFormErrors>({});

  function handleChange(field: keyof ProjectFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  return { errors, handleChange, setErrors, setValues, values };
}

export function ProjectCreatePage() {
  const client = useProjectClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { errors, handleChange, setErrors, values } = useProjectForm(defaultProjectFormValues);

  if (!canManageProjects(user?.role)) {
    return <ForbiddenProjectAction />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateProjectForm(values);

    setErrors(nextErrors);

    if (hasProjectFormErrors(nextErrors)) {
      return;
    }

    if (!client) {
      setSubmitError("Authentication is required to create projects.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const project = await client.create(toProjectPayload(values));

      navigate(`/projects/${project.id}`);
    } catch (nextError) {
      setSubmitError(errorMessage(nextError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ProjectFormPage
      errors={errors}
      isSubmitting={isSubmitting}
      onChange={handleChange}
      onSubmit={handleSubmit}
      submitError={submitError}
      submitLabel="Create project"
      title="Create Project"
      values={values}
    />
  );
}

export function ProjectEditPage() {
  const { id } = useParams();
  const client = useProjectClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { errors, handleChange, setErrors, setValues, values } = useProjectForm(defaultProjectFormValues);

  useEffect(() => {
    if (!client || !id) {
      setLoadError("Project details are unavailable.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    setIsLoading(true);
    setLoadError(null);

    client.get(id)
      .then((project) => {
        if (isMounted) {
          setValues(valuesFromProject(project));
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

  if (!canManageProjects(user?.role)) {
    return <ForbiddenProjectAction />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateProjectForm(values);

    setErrors(nextErrors);

    if (hasProjectFormErrors(nextErrors)) {
      return;
    }

    if (!client || !id) {
      setSubmitError("Project details are unavailable.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const project = await client.update(id, toProjectPayload(values));

      navigate(`/projects/${project.id}`);
    } catch (nextError) {
      setSubmitError(errorMessage(nextError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <section className="page-panel project-page">
        <p className="loading-state">Loading project...</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="page-panel project-page">
        <Link className="secondary-link back-link" to="/projects">
          Back to projects
        </Link>
        <p className="error-banner" role="alert">{loadError}</p>
      </section>
    );
  }

  return (
    <ProjectFormPage
      errors={errors}
      isSubmitting={isSubmitting}
      onChange={handleChange}
      onSubmit={handleSubmit}
      submitError={submitError}
      submitLabel="Save project"
      title="Edit Project"
      values={values}
    />
  );
}
