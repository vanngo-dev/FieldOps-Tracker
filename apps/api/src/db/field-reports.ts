import { getPrismaClient } from "./prisma";
import type {
  CreateFieldReportInput,
  FieldReportListFilter,
  FieldReportRecord,
  FieldReportStore,
  UpdateFieldReportInput,
} from "../field-reports/types";

interface PrismaFieldReportRecord {
  id: string;
  projectId: string;
  authorUserId: string;
  reportDate: Date;
  laborCount: number;
  workPerformed: string;
  blockers: string | null;
  assetNotes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const fieldReportSelect = {
  id: true,
  projectId: true,
  authorUserId: true,
  reportDate: true,
  laborCount: true,
  workPerformed: true,
  blockers: true,
  assetNotes: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Record<keyof PrismaFieldReportRecord, true>;

function toDate(value: string | undefined): Date | undefined {
  return value === undefined ? undefined : new Date(value);
}

function toFieldReportRecord(fieldReport: PrismaFieldReportRecord): FieldReportRecord {
  return {
    id: fieldReport.id,
    projectId: fieldReport.projectId,
    authorUserId: fieldReport.authorUserId,
    reportDate: fieldReport.reportDate.toISOString(),
    laborCount: fieldReport.laborCount,
    workCompleted: fieldReport.workPerformed,
    blockers: fieldReport.blockers,
    equipmentUsedNotes: fieldReport.assetNotes,
    status: fieldReport.status,
    createdAt: fieldReport.createdAt.toISOString(),
    updatedAt: fieldReport.updatedAt.toISOString(),
  };
}

function createData(input: CreateFieldReportInput) {
  return {
    projectId: input.projectId,
    authorUserId: input.authorUserId,
    reportDate: new Date(input.reportDate),
    laborCount: input.laborCount,
    workPerformed: input.workCompleted,
    blockers: input.blockers ?? undefined,
    assetNotes: input.equipmentUsedNotes ?? undefined,
    status: "draft",
  };
}

function updateData(input: UpdateFieldReportInput) {
  return {
    projectId: input.projectId,
    reportDate: toDate(input.reportDate),
    laborCount: input.laborCount,
    workPerformed: input.workCompleted,
    blockers: input.blockers,
    assetNotes: input.equipmentUsedNotes,
  };
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
}

export function createPrismaFieldReportStore(): FieldReportStore {
  function getFieldReportClient() {
    return getPrismaClient() as unknown as {
      fieldReport: {
        findMany(args: {
          where?: FieldReportListFilter;
          orderBy: { reportDate: "desc" };
          select: typeof fieldReportSelect;
        }): Promise<PrismaFieldReportRecord[]>;
        findUnique(args: { where: { id: string }; select: typeof fieldReportSelect }): Promise<PrismaFieldReportRecord | null>;
        create(args: {
          data: ReturnType<typeof createData>;
          select: typeof fieldReportSelect;
        }): Promise<PrismaFieldReportRecord>;
        update(args: {
          where: { id: string };
          data: ReturnType<typeof updateData>;
          select: typeof fieldReportSelect;
        }): Promise<PrismaFieldReportRecord>;
      };
    };
  }

  return {
    async list(filter?: FieldReportListFilter): Promise<FieldReportRecord[]> {
      const prisma = getFieldReportClient();
      const fieldReports = await prisma.fieldReport.findMany({
        where: filter,
        orderBy: { reportDate: "desc" },
        select: fieldReportSelect,
      });

      return fieldReports.map(toFieldReportRecord);
    },

    async findById(id: string): Promise<FieldReportRecord | null> {
      const prisma = getFieldReportClient();
      const fieldReport = await prisma.fieldReport.findUnique({
        where: { id },
        select: fieldReportSelect,
      });

      return fieldReport ? toFieldReportRecord(fieldReport) : null;
    },

    async create(input: CreateFieldReportInput): Promise<FieldReportRecord> {
      const prisma = getFieldReportClient();
      const fieldReport = await prisma.fieldReport.create({
        data: createData(input),
        select: fieldReportSelect,
      });

      return toFieldReportRecord(fieldReport);
    },

    async update(id: string, input: UpdateFieldReportInput): Promise<FieldReportRecord | null> {
      const prisma = getFieldReportClient();

      try {
        const fieldReport = await prisma.fieldReport.update({
          where: { id },
          data: updateData(input),
          select: fieldReportSelect,
        });

        return toFieldReportRecord(fieldReport);
      } catch (error) {
        if (isNotFoundError(error)) {
          return null;
        }

        throw error;
      }
    },
  };
}
