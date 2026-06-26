import { getApiBaseUrl } from "./config";

export const projectStatuses = ["planned", "active", "on_hold", "completed", "cancelled"] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export interface ProjectRecord {
  id: string;
  projectCode: string;
  name: string;
  description: string | null;
  clientName: string | null;
  siteLocation: string | null;
  projectManagerId: string;
  status: ProjectStatus;
  plannedStartDate: string | null;
  plannedEndDate: string | null;
  actualStartDate: string | null;
  actualEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPayload {
  projectCode: string;
  name: string;
  projectManagerId: string;
  description?: string | null;
  clientName?: string | null;
  siteLocation?: string | null;
  status?: ProjectStatus;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
}

interface ProjectsResponse {
  projects: ProjectRecord[];
}

interface ProjectResponse {
  project: ProjectRecord;
}

interface ApiErrorResponse {
  error?: string;
  errors?: string[];
}

export interface ProjectsApiClient {
  list(): Promise<ProjectRecord[]>;
  get(id: string): Promise<ProjectRecord>;
  create(input: ProjectPayload): Promise<ProjectRecord>;
  update(id: string, input: ProjectPayload): Promise<ProjectRecord>;
}

interface CreateProjectsApiClientOptions {
  apiBaseUrl?: string;
  fetcher?: typeof fetch;
}

function buildErrorMessage(status: number, body: ApiErrorResponse | null): string {
  if (body?.errors?.length) {
    return body.errors.join("; ");
  }

  if (body?.error) {
    return body.error;
  }

  return `Request failed with status ${status}`;
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as ApiErrorResponse | T | null;

  if (!response.ok) {
    throw new Error(buildErrorMessage(response.status, body as ApiErrorResponse | null));
  }

  return body as T;
}

export function createProjectsApiClient(
  token: string,
  { apiBaseUrl = getApiBaseUrl(), fetcher = fetch }: CreateProjectsApiClientOptions = {},
): ProjectsApiClient {
  const baseUrl = apiBaseUrl.replace(/\/$/, "");

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);

    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Content-Type", "application/json");

    const response = await fetcher(`${baseUrl}${path}`, {
      ...init,
      headers,
    });

    return readJson<T>(response);
  }

  return {
    async list(): Promise<ProjectRecord[]> {
      const response = await request<ProjectsResponse>("/projects");

      return response.projects;
    },

    async get(id: string): Promise<ProjectRecord> {
      const response = await request<ProjectResponse>(`/projects/${encodeURIComponent(id)}`);

      return response.project;
    },

    async create(input: ProjectPayload): Promise<ProjectRecord> {
      const response = await request<ProjectResponse>("/projects", {
        method: "POST",
        body: JSON.stringify(input),
      });

      return response.project;
    },

    async update(id: string, input: ProjectPayload): Promise<ProjectRecord> {
      const response = await request<ProjectResponse>(`/projects/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(input),
      });

      return response.project;
    },
  };
}
