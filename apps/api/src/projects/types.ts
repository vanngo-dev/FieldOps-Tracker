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

export interface CreateProjectInput {
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

export type UpdateProjectInput = Partial<CreateProjectInput>;

export interface ProjectStore {
  list(): Promise<ProjectRecord[]>;
  findById(id: string): Promise<ProjectRecord | null>;
  create(input: CreateProjectInput): Promise<ProjectRecord>;
  update(id: string, input: UpdateProjectInput): Promise<ProjectRecord | null>;
  delete(id: string): Promise<boolean>;
}
