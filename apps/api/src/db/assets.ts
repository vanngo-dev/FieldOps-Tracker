import { getPrismaClient } from "./prisma";
import type { AssetRecord, AssetStatus, AssetStore, AssignAssetResult, CreateAssetInput, UpdateAssetInput } from "../assets/types";

interface PrismaAssetRecord {
  id: string;
  name: string;
  assetTag: string;
  assetType: string;
  status: string;
  assignedProjectId: string | null;
  updatedAt: Date;
}

const assetSelect = {
  id: true,
  name: true,
  assetTag: true,
  assetType: true,
  status: true,
  assignedProjectId: true,
  updatedAt: true,
} satisfies Record<keyof PrismaAssetRecord, true>;

function toAssetRecord(asset: PrismaAssetRecord): AssetRecord {
  return {
    id: asset.id,
    name: asset.name,
    assetTag: asset.assetTag,
    assetType: asset.assetType,
    status: asset.status as AssetStatus,
    assignedProjectId: asset.assignedProjectId,
    updatedAt: asset.updatedAt.toISOString(),
  };
}

function createData(input: CreateAssetInput) {
  return {
    name: input.name,
    assetTag: input.assetTag,
    assetType: input.assetType ?? "equipment",
    status: input.status,
    assignedProjectId: input.assignedProjectId ?? undefined,
  };
}

function updateData(input: UpdateAssetInput) {
  return {
    name: input.name,
    assetTag: input.assetTag,
    assetType: input.assetType,
    status: input.status,
    assignedProjectId: input.assignedProjectId,
  };
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
}

export function createPrismaAssetStore(): AssetStore {
  function getAssetClient() {
    return getPrismaClient() as unknown as {
      asset: {
        findMany(args: { orderBy: { updatedAt: "desc" }; select: typeof assetSelect }): Promise<PrismaAssetRecord[]>;
        findUnique(args: { where: { id: string }; select: typeof assetSelect }): Promise<PrismaAssetRecord | null>;
        create(args: { data: ReturnType<typeof createData>; select: typeof assetSelect }): Promise<PrismaAssetRecord>;
        update(args: {
          where: { id: string };
          data: Record<string, unknown>;
          select: typeof assetSelect;
        }): Promise<PrismaAssetRecord>;
      };
      project: {
        findUnique(args: { where: { id: string }; select: { id: true } }): Promise<{ id: string } | null>;
      };
    };
  }

  return {
    async list(): Promise<AssetRecord[]> {
      const prisma = getAssetClient();
      const assets = await prisma.asset.findMany({
        orderBy: { updatedAt: "desc" },
        select: assetSelect,
      });

      return assets.map(toAssetRecord);
    },

    async findById(id: string): Promise<AssetRecord | null> {
      const prisma = getAssetClient();
      const asset = await prisma.asset.findUnique({
        where: { id },
        select: assetSelect,
      });

      return asset ? toAssetRecord(asset) : null;
    },

    async create(input: CreateAssetInput): Promise<AssetRecord> {
      const prisma = getAssetClient();
      const asset = await prisma.asset.create({
        data: createData(input),
        select: assetSelect,
      });

      return toAssetRecord(asset);
    },

    async update(id: string, input: UpdateAssetInput): Promise<AssetRecord | null> {
      const prisma = getAssetClient();

      try {
        const asset = await prisma.asset.update({
          where: { id },
          data: updateData(input),
          select: assetSelect,
        });

        return toAssetRecord(asset);
      } catch (error) {
        if (isNotFoundError(error)) {
          return null;
        }

        throw error;
      }
    },

    async assignToProject(id: string, projectId: string): Promise<AssignAssetResult> {
      const prisma = getAssetClient();
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true },
      });

      if (!project) {
        return { status: "project_not_found" };
      }

      try {
        const asset = await prisma.asset.update({
          where: { id },
          data: {
            assignedProjectId: projectId,
            status: "assigned",
          },
          select: assetSelect,
        });

        return { status: "assigned", asset: toAssetRecord(asset) };
      } catch (error) {
        if (isNotFoundError(error)) {
          return { status: "asset_not_found" };
        }

        throw error;
      }
    },
  };
}
