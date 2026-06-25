import { getPrismaClient } from "./prisma";
import type { CreateProjectInput, ProjectRecord, ProjectStatus, ProjectStore, UpdateProjectInput } from "../projects/types";

interface PrismaProjectRecord {
  id: string;
  projectCode: string;
  name: string;
  description: string | null;
  clientName: string | null;
  siteLocation: string | null;
  projectManagerId: string;
  status: string;
  plannedStartDate: Date | null;
  plannedEndDate: Date | null;
  actualStartDate: Date | null;
  actualEndDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const projectSelect = {
  id: true,
  projectCode: true,
  name: true,
  description: true,
  clientName: true,
  siteLocation: true,
  projectManagerId: true,
  status: true,
  plannedStartDate: true,
  plannedEndDate: true,
  actualStartDate: true,
  actualEndDate: true,
  createdAt: true,
  updatedAt: true,
} satisfies Record<keyof PrismaProjectRecord, true>;

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value === null ? null : new Date(value);
}

function toProjectRecord(project: PrismaProjectRecord): ProjectRecord {
  return {
    id: project.id,
    projectCode: project.projectCode,
    name: project.name,
    description: project.description,
    clientName: project.clientName,
    siteLocation: project.siteLocation,
    projectManagerId: project.projectManagerId,
    status: project.status as ProjectStatus,
    plannedStartDate: toIsoString(project.plannedStartDate),
    plannedEndDate: toIsoString(project.plannedEndDate),
    actualStartDate: toIsoString(project.actualStartDate),
    actualEndDate: toIsoString(project.actualEndDate),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

function createData(input: CreateProjectInput) {
  return {
    projectCode: input.projectCode,
    name: input.name,
    description: input.description ?? undefined,
    clientName: input.clientName ?? undefined,
    siteLocation: input.siteLocation ?? undefined,
    projectManagerId: input.projectManagerId,
    status: input.status ?? "planned",
    plannedStartDate: toDate(input.plannedStartDate),
    plannedEndDate: toDate(input.plannedEndDate),
    actualStartDate: toDate(input.actualStartDate),
    actualEndDate: toDate(input.actualEndDate),
  };
}

function updateData(input: UpdateProjectInput) {
  return {
    projectCode: input.projectCode,
    name: input.name,
    description: input.description,
    clientName: input.clientName,
    siteLocation: input.siteLocation,
    projectManagerId: input.projectManagerId,
    status: input.status,
    plannedStartDate: toDate(input.plannedStartDate),
    plannedEndDate: toDate(input.plannedEndDate),
    actualStartDate: toDate(input.actualStartDate),
    actualEndDate: toDate(input.actualEndDate),
  };
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
}

export function createPrismaProjectStore(): ProjectStore {
  function getProjectClient() {
    return getPrismaClient() as unknown as {
      project: {
        findMany(args: { orderBy: { createdAt: "desc" }; select: typeof projectSelect }): Promise<PrismaProjectRecord[]>;
        findUnique(args: { where: { id: string }; select: typeof projectSelect }): Promise<PrismaProjectRecord | null>;
        create(args: { data: ReturnType<typeof createData>; select: typeof projectSelect }): Promise<PrismaProjectRecord>;
        update(args: { where: { id: string }; data: ReturnType<typeof updateData>; select: typeof projectSelect }): Promise<PrismaProjectRecord>;
        delete(args: { where: { id: string }; select: { id: true } }): Promise<{ id: string }>;
      };
    };
  }

  return {
    async list(): Promise<ProjectRecord[]> {
      const prisma = getProjectClient();
      const projects = await prisma.project.findMany({
        orderBy: { createdAt: "desc" },
        select: projectSelect,
      });

      return projects.map(toProjectRecord);
    },

    async findById(id: string): Promise<ProjectRecord | null> {
      const prisma = getProjectClient();
      const project = await prisma.project.findUnique({
        where: { id },
        select: projectSelect,
      });

      return project ? toProjectRecord(project) : null;
    },

    async create(input: CreateProjectInput): Promise<ProjectRecord> {
      const prisma = getProjectClient();
      const project = await prisma.project.create({
        data: createData(input),
        select: projectSelect,
      });

      return toProjectRecord(project);
    },

    async update(id: string, input: UpdateProjectInput): Promise<ProjectRecord | null> {
      const prisma = getProjectClient();
      try {
        const project = await prisma.project.update({
          where: { id },
          data: updateData(input),
          select: projectSelect,
        });

        return toProjectRecord(project);
      } catch (error) {
        if (isNotFoundError(error)) {
          return null;
        }

        throw error;
      }
    },

    async delete(id: string): Promise<boolean> {
      const prisma = getProjectClient();
      try {
        await prisma.project.delete({
          where: { id },
          select: { id: true },
        });

        return true;
      } catch (error) {
        if (isNotFoundError(error)) {
          return false;
        }

        throw error;
      }
    },
  };
}
