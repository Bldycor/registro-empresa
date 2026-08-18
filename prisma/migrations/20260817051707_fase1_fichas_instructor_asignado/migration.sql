-- Fase 1: modelo de asignacion instructor<->aprendiz por ficha.
-- Reemplaza el campo suelto "codigoFicha" (texto libre) y la autorelacion directa
-- "instructorId" en User (Fase 0, nunca usada desde la UI) por un modelo Ficha real:
-- cada ficha tiene a lo sumo un instructor autorizado para evaluarla, y el aprendiz
-- se enlaza a su ficha en vez de guardar el codigo como texto suelto.

-- CreateTable
CREATE TABLE "Ficha" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "programa" TEXT,
    "instructorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ficha_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ficha_codigo_key" ON "Ficha"("codigo");

-- AddForeignKey
ALTER TABLE "Ficha" ADD CONSTRAINT "Ficha_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: agregar fichaId a User
ALTER TABLE "User" ADD COLUMN "fichaId" TEXT;

-- Migracion de datos: crear una Ficha por cada codigo de ficha distinto que ya
-- estuviera guardado como texto en User.codigoFicha.
INSERT INTO "Ficha" ("id", "codigo", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || "codigoFicha"), "codigoFicha", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "codigoFicha" FROM "User" WHERE "codigoFicha" IS NOT NULL) AS fichas_existentes;

-- Enlazar cada aprendiz con la Ficha recien creada para su codigo.
UPDATE "User" u
SET "fichaId" = f."id"
FROM "Ficha" f
WHERE u."codigoFicha" = f."codigo";

-- Eliminar el campo de texto libre, ya migrado.
ALTER TABLE "User" DROP COLUMN "codigoFicha";

-- Eliminar la autorelacion directa instructorId de Fase 0 (nunca tuvo datos, la
-- reemplaza la relacion via Ficha.instructorId).
ALTER TABLE "User" DROP CONSTRAINT "User_instructorId_fkey";
ALTER TABLE "User" DROP COLUMN "instructorId";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_fichaId_fkey" FOREIGN KEY ("fichaId") REFERENCES "Ficha"("id") ON DELETE SET NULL ON UPDATE CASCADE;
