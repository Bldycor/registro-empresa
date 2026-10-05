import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Cliente sin auditoría. Solo lo usan `src/lib/prisma.ts` (que le agrega la trazabilidad) y
// `src/lib/auditoria.ts` (para escribir el propio rastro y los contadores de ingreso sin que
// cada escritura genere otra). El resto de la aplicación usa `prisma` de `src/lib/prisma.ts`.
const globalForPrisma = globalThis as unknown as {
  prismaBase: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prismaBase = globalForPrisma.prismaBase ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaBase = prismaBase;
}
