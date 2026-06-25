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

export interface CreateTimesheetInput {
  projectId: string;
  employeeId: string;
  submittedByUserId: string;
  workDate: string;
  regularHours: number;
  overtimeHours?: number;
  notes?: string | null;
}

export interface UpdateTimesheetInput {
  projectId?: string;
  employeeId?: string;
  workDate?: string;
  regularHours?: number;
  overtimeHours?: number;
  notes?: string | null;
}

export interface TimesheetListFilter {
  submittedByUserId?: string;
}

export interface TimesheetStore {
  list(filter?: TimesheetListFilter): Promise<TimesheetRecord[]>;
  findById(id: string): Promise<TimesheetRecord | null>;
  create(input: CreateTimesheetInput): Promise<TimesheetRecord>;
  update(id: string, input: UpdateTimesheetInput): Promise<TimesheetRecord | null>;
  submit(id: string): Promise<TimesheetRecord | null>;
  approve(id: string, approvedByUserId: string): Promise<TimesheetRecord | null>;
  reject(id: string): Promise<TimesheetRecord | null>;
}
