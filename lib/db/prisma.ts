import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma() {
  if (!globalForPrisma.prisma) {
    const url = runtimeDatabaseUrl();
    globalForPrisma.prisma = new PrismaClient(
      url ? { datasources: { db: { url } } } : undefined,
    );
  }

  return globalForPrisma.prisma;
}

function runtimeDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return undefined;

  try {
    const url = new URL(databaseUrl);
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "3");
    }
    return url.toString();
  } catch {
    return databaseUrl;
  }
}
