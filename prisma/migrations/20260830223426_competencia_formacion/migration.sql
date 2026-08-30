
-- CreateEnum
CREATE TYPE "TipoCompetencia" AS ENUM ('TECNICA', 'BASICA_CLAVE');

-- CreateTable
CREATE TABLE "CompetenciaFormacion" (
    "id" TEXT NOT NULL,
    "programa" TEXT NOT NULL,
    "tipo" "TipoCompetencia" NOT NULL,
    "codigoCompetencia" TEXT NOT NULL,
    "nombreCompetencia" TEXT NOT NULL,
    "resultadoAprendizaje" TEXT NOT NULL,
    "horas" INTEGER,
    "redConocimiento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetenciaFormacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetenciaFormacion_programa_idx" ON "CompetenciaFormacion"("programa");

-- CreateIndex
CREATE UNIQUE INDEX "CompetenciaFormacion_programa_codigoCompetencia_resultadoAp_key" ON "CompetenciaFormacion"("programa", "codigoCompetencia", "resultadoAprendizaje");

