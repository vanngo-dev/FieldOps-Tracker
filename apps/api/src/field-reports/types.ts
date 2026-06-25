export interface FieldReportRecord {
  id: string;
  projectId: string;
  authorUserId: string;
  reportDate: string;
  laborCount: number;
  workCompleted: string;
  blockers: string | null;
  equipmentUsedNotes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFieldReportInput {
  projectId: string;
  authorUserId: string;
  reportDate: string;
  laborCount: number;
  workCompleted: string;
  blockers?: string | null;
  equipmentUsedNotes?: string | null;
}

export interface UpdateFieldReportInput {
  projectId?: string;
  reportDate?: string;
  laborCount?: number;
  workCompleted?: string;
  blockers?: string | null;
  equipmentUsedNotes?: string | null;
}

export interface FieldReportListFilter {
  authorUserId?: string;
}

export interface FieldReportStore {
  list(filter?: FieldReportListFilter): Promise<FieldReportRecord[]>;
  findById(id: string): Promise<FieldReportRecord | null>;
  create(input: CreateFieldReportInput): Promise<FieldReportRecord>;
  update(id: string, input: UpdateFieldReportInput): Promise<FieldReportRecord | null>;
}
