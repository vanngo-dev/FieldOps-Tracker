import path from "node:path";

export type DatabaseProvider = "sqlserver";

export interface DatabaseConfig {
  provider: DatabaseProvider;
  url: string;
  schemaPath: string;
}

export interface DatabaseEnv {
  DATABASE_URL?: string;
}

export function getPrismaSchemaPath(baseDir = process.cwd()): string {
  return path.resolve(baseDir, "prisma", "schema.prisma");
}

export function getDatabaseConfig(
  env: DatabaseEnv = process.env,
  baseDir = process.cwd(),
): DatabaseConfig {
  const url = env.DATABASE_URL?.trim();

  if (!url) {
    throw new Error("DATABASE_URL is required for SQL Server database access.");
  }

  if (!url.toLowerCase().startsWith("sqlserver://")) {
    throw new Error("DATABASE_URL must use a SQL Server connection string starting with sqlserver://.");
  }

  return {
    provider: "sqlserver",
    url,
    schemaPath: getPrismaSchemaPath(baseDir),
  };
}
