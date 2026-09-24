-- Novedades de la etapa productiva (guía GFPI-G-040 §9.2): hechos que afectan el desarrollo de la
-- práctica sin detenerla, con sus plazos de registro (3 días hábiles) y de anotación en la
-- bitácora (5 días hábiles). Solo agrega.
CREATE TYPE "TipoNovedadEP" AS ENUM (
  'CAMBIO_COFORMADOR',
  'CAMBIO_FUNCIONES',
  'CAMBIO_SEDE_HORARIO',
  'ACCIDENTE_TRABAJO',
  'INCAPACIDAD_CORTA',
  'AFILIACION_ARL',
  'APOYO_SOSTENIMIENTO',
  'AUSENCIA_O_INACTIVIDAD',
  'DIFICULTAD_PLAN_TRABAJO',
  'OTRA'
);

CREATE TABLE "NovedadEtapaProductiva" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tipo" "TipoNovedadEP" NOT NULL,
  "descripcion" TEXT NOT NULL,
  "fechaHecho" TIMESTAMP(3) NOT NULL,
  "soporteUrl" TEXT,
  "registradaPorId" TEXT,
  "bitacoraNumero" INTEGER,
  "fechaAnotacionBitacora" TIMESTAMP(3),
  "observacionesInstructor" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NovedadEtapaProductiva_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NovedadEtapaProductiva_userId_idx" ON "NovedadEtapaProductiva"("userId");

ALTER TABLE "NovedadEtapaProductiva"
  ADD CONSTRAINT "NovedadEtapaProductiva_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NovedadEtapaProductiva"
  ADD CONSTRAINT "NovedadEtapaProductiva_registradaPorId_fkey"
  FOREIGN KEY ("registradaPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
