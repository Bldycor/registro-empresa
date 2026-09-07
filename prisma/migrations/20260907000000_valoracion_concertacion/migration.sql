-- Valoración del instructor sobre el Momento 1 (Concertación/Planeación), con la misma escala
-- Satisfactorio/Por mejorar usada en los Momentos 2 y 3, sobre 5 variables propias de la calidad
-- de la planeación acordada (no de desempeño, ya que la etapa productiva aún no ha iniciado).

-- CreateEnum
CREATE TYPE "VariablePlaneacionEP" AS ENUM ('COMPETENCIAS_RESULTADOS_DEFINIDOS', 'ACTIVIDADES_EVIDENCIAS_PLANTEADAS', 'AFILIACION_ARL', 'HORARIO_ACORDADO', 'PARTICIPACION_COFORMADOR');

-- AlterTable
ALTER TABLE "ConcertacionFuncion" ADD COLUMN     "estado" "EstadoEvidencia" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "avaladoPorId" TEXT,
ADD COLUMN     "fechaAval" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ConcertacionVariable" (
    "id" TEXT NOT NULL,
    "concertacionId" TEXT NOT NULL,
    "variable" "VariablePlaneacionEP" NOT NULL,
    "valoracion" "ValoracionVariable",
    "observaciones" TEXT,

    CONSTRAINT "ConcertacionVariable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConcertacionVariable_concertacionId_variable_key" ON "ConcertacionVariable"("concertacionId", "variable");

-- AddForeignKey
ALTER TABLE "ConcertacionFuncion" ADD CONSTRAINT "ConcertacionFuncion_avaladoPorId_fkey" FOREIGN KEY ("avaladoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConcertacionVariable" ADD CONSTRAINT "ConcertacionVariable_concertacionId_fkey" FOREIGN KEY ("concertacionId") REFERENCES "ConcertacionFuncion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
