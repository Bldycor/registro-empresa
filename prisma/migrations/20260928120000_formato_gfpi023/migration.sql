-- Formato GFPI-F-023 por momento: el aprendiz diligencia lo suyo, previsualiza el formato con los
-- datos que el sistema ya tiene y adjunta el PDF firmado, como en Alternativa EP y Formalización.
-- Solo agrega.

-- Adjunto del Momento 1 (Concertación).
ALTER TABLE "ConcertacionFuncion" ADD COLUMN "archivoUrl" TEXT;

-- Adjunto de los Momentos 2 y 3, y el número de visitas que pide el Momento 3.
ALTER TABLE "Evaluacion" ADD COLUMN "archivoUrl" TEXT;
ALTER TABLE "Evaluacion" ADD COLUMN "numeroVisitas" INTEGER;

-- Datos que pide el formato y que no salían de ningún otro lado. Los escribe el aprendiz una vez
-- y valen para los tres momentos; lo que no sepa queda en blanco, nunca inventado.
CREATE TABLE "DatosFormatoEP" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "regional" TEXT,
  "centroFormacion" TEXT,
  "estrategiaFormativa" TEXT,
  "correoInstitucional" TEXT,
  "nitEmpresa" TEXT,
  "asistenciaNombre" TEXT,
  "asistenciaTipo" TEXT,
  "asistenciaContacto" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DatosFormatoEP_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DatosFormatoEP_userId_key" ON "DatosFormatoEP"("userId");

ALTER TABLE "DatosFormatoEP"
  ADD CONSTRAINT "DatosFormatoEP_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
