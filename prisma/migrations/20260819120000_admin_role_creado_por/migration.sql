-- Rol ADMIN (control total, único que puede crear cuentas de Coordinador) y trazabilidad de
-- quién creó cada cuenta (Coordinador creado por un Admin, Instructor creado por un Coordinador).

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "creadoPorId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
