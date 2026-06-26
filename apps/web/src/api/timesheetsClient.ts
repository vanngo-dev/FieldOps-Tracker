import { getApiBaseUrl } from "./config";

export const timesheetStatuses = ["draft", "submitted", "approved", "rejected"] as const;

export type TimesheetStatus = (typeof timesheetStatuses)[number];

export interface TimesheetRecord {
  id: string;
  projectId: string;
  employeeId: string;
  submittedByUserId: string;
  workDate: string;
  regularHours: number;
  overtimeHours: number;
  notes: string | null;
  status: TimesheetStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetPayload {
  projectId: string;
  employeeId: string;
  workDate: string;
  regularHours: number;
  overtimeHours?: number;
  notes?: string | null;
}

interface TimesheetsResponse {
  timesheets: TimesheetRecord[];
}

interface TimesheetResponse {
  timesheet: TimesheetRecord;
}

interface ApiErrorResponse {
  error?: string;
  errors?: string[];
}

export interface TimesheetsApiClient {
  list(): Promise<TimesheetRecord[]>;
  get(id: string): Promise<TimesheetRecord>;
  create(input: TimesheetPayload): Promise<TimesheetRecord>;
  update(id: string, input: TimesheetPayload): Promise<TimesheetRecord>;
  submit(id: string): Promise<TimesheetRecord>;
  approve(id: string): Promise<TimesheetRecord>;
  reject(id: string): Promise<TimesheetRecord>;
}

interface CreateTimesheetsApiClientOptions {
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

export function createTimesheetsApiClient(
  token: string,
  { apiBaseUrl = getApiBaseUrl(), fetcher = fetch }: CreateTimesheetsApiClientOptions = {},
): TimesheetsApiClient {
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

  async function runTimesheetAction(id: string, action: "submit" | "approve" | "reject"): Promise<TimesheetRecord> {
    const response = await request<TimesheetResponse>(`/timesheets/${encodeURIComponent(id)}/${action}`, {
      method: "POST",
    });

    return response.timesheet;
  }

  return {
    async list(): Promise<TimesheetRecord[]> {
      const response = await request<TimesheetsResponse>("/timesheets");

      return response.timesheets;
    },

    async get(id: string): Promise<TimesheetRecord> {
      const response = await request<TimesheetResponse>(`/timesheets/${encodeURIComponent(id)}`);

      return response.timesheet;
    },

    async create(input: TimesheetPayload): Promise<TimesheetRecord> {
      const response = await request<TimesheetResponse>("/timesheets", {
        method: "POST",
        body: JSON.stringify(input),
      });

      return response.timesheet;
    },

    async update(id: string, input: TimesheetPayload): Promise<TimesheetRecord> {
      const response = await request<TimesheetResponse>(`/timesheets/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(input),
      });

      return response.timesheet;
    },

    submit(id: string): Promise<TimesheetRecord> {
      return runTimesheetAction(id, "submit");
    },

    approve(id: string): Promise<TimesheetRecord> {
      return runTimesheetAction(id, "approve");
    },

    reject(id: string): Promise<TimesheetRecord> {
      return runTimesheetAction(id, "reject");
    },
  };
}
