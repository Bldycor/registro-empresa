-- Parámetros del centro para el formato GFPI-F-023 (Regional, Centro de formación y Estrategia
-- formativa). Son iguales para todos los aprendices: los fija Coordinación una vez y entran solos
-- en los tres momentos. Fila única, id = 'centro'. Solo agrega.
CREATE TABLE "ConfiguracionCentro" (
  "id" TEXT NOT NULL DEFAULT 'centro',
  "regional" TEXT,
  "centroFormacion" TEXT,
  "estrategiaFormativa" TEXT,
  "actualizadoPorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConfiguracionCentro_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ConfiguracionCentro"
  ADD CONSTRAINT "ConfiguracionCentro_actualizadoPorId_fkey"
  FOREIGN KEY ("actualizadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
