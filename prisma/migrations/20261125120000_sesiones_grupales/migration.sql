-- Sesiones grupales de los momentos (25 nov 2026). Solo aditiva: una tabla nueva y dos columnas
-- opcionales.
CREATE TABLE "SesionGrupal" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "momento" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "modalidad" "ModalidadEjecucionEP" NOT NULL,
    "lugar" TEXT,
    "videollamadaUrl" TEXT,
    "googleEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SesionGrupal_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SesionGrupal_instructorId_fecha_idx" ON "SesionGrupal"("instructorId", "fecha");
ALTER TABLE "SesionGrupal" ADD CONSTRAINT "SesionGrupal_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConcertacionFuncion" ADD COLUMN "sesionGrupalId" TEXT;
ALTER TABLE "ConcertacionFuncion" ADD CONSTRAINT "ConcertacionFuncion_sesionGrupalId_fkey" FOREIGN KEY ("sesionGrupalId") REFERENCES "SesionGrupal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Evaluacion" ADD COLUMN "sesionGrupalId" TEXT;
ALTER TABLE "Evaluacion" ADD CONSTRAINT "Evaluacion_sesionGrupalId_fkey" FOREIGN KEY ("sesionGrupalId") REFERENCES "SesionGrupal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
