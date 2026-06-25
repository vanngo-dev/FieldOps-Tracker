export const assetStatuses = ["available", "assigned", "maintenance", "retired"] as const;

export type AssetStatus = (typeof assetStatuses)[number];

export interface AssetRecord {
  id: string;
  name: string;
  assetTag: string;
  assetType: string;
  status: AssetStatus;
  assignedProjectId: string | null;
  updatedAt: string;
}

export interface CreateAssetInput {
  name: string;
  assetTag: string;
  status: AssetStatus;
  assetType?: string;
  assignedProjectId?: string | null;
}

export interface UpdateAssetInput {
  name?: string;
  assetTag?: string;
  status?: AssetStatus;
  assetType?: string;
  assignedProjectId?: string | null;
}

export type AssignAssetResult =
  | { status: "assigned"; asset: AssetRecord }
  | { status: "asset_not_found" }
  | { status: "project_not_found" };

export interface AssetStore {
  list(): Promise<AssetRecord[]>;
  findById(id: string): Promise<AssetRecord | null>;
  create(input: CreateAssetInput): Promise<AssetRecord>;
  update(id: string, input: UpdateAssetInput): Promise<AssetRecord | null>;
  assignToProject(id: string, projectId: string): Promise<AssignAssetResult>;
}
