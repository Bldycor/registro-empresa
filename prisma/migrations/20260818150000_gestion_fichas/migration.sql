-- Datos de gestión institucional de la ficha, migrados desde la hoja de cálculo de control de
-- fichas (estado, nivel de formación, jornada, fechas de ficha/etapa productiva/formación/límite).

-- CreateEnum
CREATE TYPE "EstadoFicha" AS ENUM ('EN_EJECUCION', 'TERMINADA', 'TERMINADA_POR_FECHA');

-- CreateEnum
CREATE TYPE "NivelFormacion" AS ENUM ('TECNICO', 'TECNOLOGO', 'AUXILIAR');

-- CreateEnum
CREATE TYPE "Jornada" AS ENUM ('MANANA', 'TARDE', 'NOCHE', 'MIXTA', 'VIRTUAL', 'TARDE_NOCHE');

-- AlterTable
ALTER TABLE "Ficha" ADD COLUMN "estado" "EstadoFicha";
ALTER TABLE "Ficha" ADD COLUMN "nivelFormacion" "NivelFormacion";
ALTER TABLE "Ficha" ADD COLUMN "jornada" "Jornada";
ALTER TABLE "Ficha" ADD COLUMN "fechaInicioFicha" TIMESTAMP(3);
ALTER TABLE "Ficha" ADD COLUMN "fechaInicioProductiva" TIMESTAMP(3);
ALTER TABLE "Ficha" ADD COLUMN "fechaFinFormacion" TIMESTAMP(3);
ALTER TABLE "Ficha" ADD COLUMN "fechaLimiteIniciarEP" TIMESTAMP(3);
