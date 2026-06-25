import { PrismaClient } from "@prisma/client";

import { getDatabaseConfig } from "../config/database";

let prisma: PrismaClient | undefined;

export function createPrismaClient(): PrismaClient {
  const config = getDatabaseConfig();

  return new PrismaClient({
    datasources: {
      db: {
        url: config.url,
      },
    },
  });
}

export function getPrismaClient(): PrismaClient {
  prisma ??= createPrismaClient();

  return prisma;
}
