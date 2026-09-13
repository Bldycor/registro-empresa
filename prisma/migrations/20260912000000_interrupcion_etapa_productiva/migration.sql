-- Interrupción y retoma de la Etapa Productiva con otra alternativa (guía GFPI-G-040 §7, §9.3 y
-- §9.3.1): el aprendiz puede no terminar la EP con la alternativa inicial y continuarla con otra,
-- contabilizando el tiempo ya ejecutado para no repetirlo.

-- AlterEnum
ALTER TYPE "EstadoAprendiz" ADD VALUE 'PRACTICA_INTERRUMPIDA' BEFORE 'POR_CERTIFICAR';

-- CreateEnum
CREATE TYPE "MotivoInterrupcionEP" AS ENUM ('LIQUIDACION_EMPRESA', 'SALUD_CERTIFICADA', 'ASUNTOS_JUDICIALES', 'SERVICIO_MILITAR', 'DESPLAZAMIENTO_GEOGRAFICO', 'TERMINACION_ANTICIPADA_CONTRATO', 'LICENCIA_MATERNIDAD', 'INCAPACIDAD', 'FUERZA_MAYOR', 'RENUNCIA_VOLUNTARIA', 'OTRO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "diasEjecutadosPrevios" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "bitacoraInicioTramo" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "InterrupcionEtapaProductiva" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alternativa" "AlternativaEtapaProductiva" NOT NULL,
    "fechaInicioTramo" TIMESTAMP(3) NOT NULL,
    "fechaInterrupcion" TIMESTAMP(3) NOT NULL,
    "diasEjecutados" INTEGER NOT NULL,
    "motivo" "MotivoInterrupcionEP" NOT NULL,
    "motivoDetalle" TEXT,
    "certificadoUrl" TEXT,
    "estado" "EstadoEvidencia" NOT NULL DEFAULT 'PENDIENTE',
    "avaladoPorId" TEXT,
    "fechaAval" TIMESTAMP(3),
    "observacionesAval" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterrupcionEtapaProductiva_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterrupcionEtapaProductiva_userId_idx" ON "InterrupcionEtapaProductiva"("userId");

-- AddForeignKey
ALTER TABLE "InterrupcionEtapaProductiva" ADD CONSTRAINT "InterrupcionEtapaProductiva_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterrupcionEtapaProductiva" ADD CONSTRAINT "InterrupcionEtapaProductiva_avaladoPorId_fkey" FOREIGN KEY ("avaladoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
