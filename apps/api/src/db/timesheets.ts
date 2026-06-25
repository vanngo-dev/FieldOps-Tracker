import { getPrismaClient } from "./prisma";
import type {
  CreateTimesheetInput,
  TimesheetListFilter,
  TimesheetRecord,
  TimesheetStatus,
  TimesheetStore,
  UpdateTimesheetInput,
} from "../timesheets/types";

interface PrismaTimesheetRecord {
  id: string;
  projectId: string;
  employeeId: string;
  submittedByUserId: string;
  workDate: Date;
  regularHours: unknown;
  overtimeHours: unknown;
  notes: string | null;
  status: string;
  submittedAt: Date | null;
  approvedAt: Date | null;
  approvedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const timesheetSelect = {
  id: true,
  projectId: true,
  employeeId: true,
  submittedByUserId: true,
  workDate: true,
  regularHours: true,
  overtimeHours: true,
  notes: true,
  status: true,
  submittedAt: true,
  approvedAt: true,
  approvedByUserId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Record<keyof PrismaTimesheetRecord, true>;

function toNumber(value: unknown): number {
  return Number(value);
}

function toIsoString(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toDate(value: string | undefined): Date | undefined {
  return value === undefined ? undefined : new Date(value);
}

function toTimesheetRecord(timesheet: PrismaTimesheetRecord): TimesheetRecord {
  return {
    id: timesheet.id,
    projectId: timesheet.projectId,
    employeeId: timesheet.employeeId,
    submittedByUserId: timesheet.submittedByUserId,
    workDate: timesheet.workDate.toISOString(),
    regularHours: toNumber(timesheet.regularHours),
    overtimeHours: toNumber(timesheet.overtimeHours),
    notes: timesheet.notes,
    status: timesheet.status as TimesheetStatus,
    submittedAt: toIsoString(timesheet.submittedAt),
    approvedAt: toIsoString(timesheet.approvedAt),
    approvedByUserId: timesheet.approvedByUserId,
    createdAt: timesheet.createdAt.toISOString(),
    updatedAt: timesheet.updatedAt.toISOString(),
  };
}

function createData(input: CreateTimesheetInput) {
  return {
    projectId: input.projectId,
    employeeId: input.employeeId,
    submittedByUserId: input.submittedByUserId,
    workDate: new Date(input.workDate),
    regularHours: input.regularHours,
    overtimeHours: input.overtimeHours ?? 0,
    notes: input.notes ?? undefined,
    status: "draft",
  };
}

function updateData(input: UpdateTimesheetInput) {
  return {
    projectId: input.projectId,
    employeeId: input.employeeId,
    workDate: toDate(input.workDate),
    regularHours: input.regularHours,
    overtimeHours: input.overtimeHours,
    notes: input.notes,
  };
}

function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
}

export function createPrismaTimesheetStore(): TimesheetStore {
  function getTimesheetClient() {
    return getPrismaClient() as unknown as {
      timesheet: {
        findMany(args: {
          where?: TimesheetListFilter;
          orderBy: { workDate: "desc" };
          select: typeof timesheetSelect;
        }): Promise<PrismaTimesheetRecord[]>;
        findUnique(args: { where: { id: string }; select: typeof timesheetSelect }): Promise<PrismaTimesheetRecord | null>;
        create(args: { data: ReturnType<typeof createData>; select: typeof timesheetSelect }): Promise<PrismaTimesheetRecord>;
        update(args: {
          where: { id: string };
          data: Record<string, unknown>;
          select: typeof timesheetSelect;
        }): Promise<PrismaTimesheetRecord>;
      };
    };
  }

  async function updateTimesheet(id: string, data: Record<string, unknown>): Promise<TimesheetRecord | null> {
    const prisma = getTimesheetClient();

    try {
      const timesheet = await prisma.timesheet.update({
        where: { id },
        data,
        select: timesheetSelect,
      });

      return toTimesheetRecord(timesheet);
    } catch (error) {
      if (isNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  return {
    async list(filter?: TimesheetListFilter): Promise<TimesheetRecord[]> {
      const prisma = getTimesheetClient();
      const timesheets = await prisma.timesheet.findMany({
        where: filter,
        orderBy: { workDate: "desc" },
        select: timesheetSelect,
      });

      return timesheets.map(toTimesheetRecord);
    },

    async findById(id: string): Promise<TimesheetRecord | null> {
      const prisma = getTimesheetClient();
      const timesheet = await prisma.timesheet.findUnique({
        where: { id },
        select: timesheetSelect,
      });

      return timesheet ? toTimesheetRecord(timesheet) : null;
    },

    async create(input: CreateTimesheetInput): Promise<TimesheetRecord> {
      const prisma = getTimesheetClient();
      const timesheet = await prisma.timesheet.create({
        data: createData(input),
        select: timesheetSelect,
      });

      return toTimesheetRecord(timesheet);
    },

    update(id: string, input: UpdateTimesheetInput): Promise<TimesheetRecord | null> {
      return updateTimesheet(id, updateData(input));
    },

    submit(id: string): Promise<TimesheetRecord | null> {
      return updateTimesheet(id, {
        status: "submitted",
        submittedAt: new Date(),
      });
    },

    approve(id: string, approvedByUserId: string): Promise<TimesheetRecord | null> {
      return updateTimesheet(id, {
        status: "approved",
        approvedAt: new Date(),
        approvedByUserId,
      });
    },

    reject(id: string): Promise<TimesheetRecord | null> {
      return updateTimesheet(id, {
        status: "rejected",
      });
    },
  };
}
