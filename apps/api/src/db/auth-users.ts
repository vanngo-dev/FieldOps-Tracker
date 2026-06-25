import { getPrismaClient } from "./prisma";
import { isUserRole } from "../auth/roles";
import type { AuthUserStore, LoginUserRecord } from "../auth/types";

interface PrismaUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  status: string;
}

function toLoginUserRecord(user: PrismaUserRecord): LoginUserRecord | null {
  if (!isUserRole(user.role)) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    passwordHash: user.passwordHash,
    role: user.role,
    status: user.status,
  };
}

export function createPrismaAuthUserStore(): AuthUserStore {
  return {
    async findByEmail(email: string): Promise<LoginUserRecord | null> {
      const prisma = getPrismaClient() as unknown as {
        user: {
          findUnique(args: {
            where: { email: string };
            select: Record<keyof PrismaUserRecord, true>;
          }): Promise<PrismaUserRecord | null>;
        };
      };

      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          passwordHash: true,
          role: true,
          status: true,
        },
      });

      return user ? toLoginUserRecord(user) : null;
    },
  };
}
