-- Guía GFPI-G-040 §9.3 (aplazamiento por novedad) y §9.1.1 (deserción).
-- Migración puramente aditiva: valores nuevos de enum, columnas nullable y una tabla nueva.
-- Ningún aprendiz existente cambia de estado ni pierde fechas.

-- 1. Estados nuevos del aprendiz.
--    APLAZADA va después de PRACTICA_INTERRUMPIDA (son las dos pausas del proceso) y DESERTADO
--    al final (es el cierre por abandono, simétrico a CERTIFICADO).
ALTER TYPE "EstadoAprendiz" ADD VALUE IF NOT EXISTS 'APLAZADA' AFTER 'PRACTICA_INTERRUMPIDA';
ALTER TYPE "EstadoAprendiz" ADD VALUE IF NOT EXISTS 'DESERTADO' AFTER 'CERTIFICADO';

-- 2. Motivos de aplazamiento.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MotivoAplazamientoEP') THEN
    CREATE TYPE "MotivoAplazamientoEP" AS ENUM (
      'LICENCIA_MATERNIDAD',
      'INCAPACIDAD_MEDICA',
      'VACACIONES_COLECTIVAS',
      'CESE_ACTIVIDAD_EMPRESA',
      'FUERZA_MAYOR',
      'OTRO'
    );
  END IF;
END
$$;

-- 3. Registro de la declaración de deserción en el aprendiz.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fechaDesercion" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "motivoDesercion" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "declaradoDesertorPorId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_declaradoDesertorPorId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_declaradoDesertorPorId_fkey"
      FOREIGN KEY ("declaradoDesertorPorId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- 4. Aplazamientos.
CREATE TABLE IF NOT EXISTS "AplazamientoEtapaProductiva" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "alternativa" "AlternativaEtapaProductiva" NOT NULL,
  "fechaInicioTramo" TIMESTAMP(3) NOT NULL,
  "fechaSuspension" TIMESTAMP(3) NOT NULL,
  "fechaReanudacionPrevista" TIMESTAMP(3) NOT NULL,
  "diasEjecutados" INTEGER NOT NULL,
  "motivo" "MotivoAplazamientoEP" NOT NULL,
  "motivoDetalle" TEXT,
  "soporteUrl" TEXT,
  "estado" "EstadoEvidencia" NOT NULL DEFAULT 'PENDIENTE',
  "avaladoPorId" TEXT,
  "fechaAval" TIMESTAMP(3),
  "observacionesAval" TEXT,
  "actaComite" TEXT,
  "fechaActaComite" TIMESTAMP(3),
  "fechaReanudacionReal" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AplazamientoEtapaProductiva_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AplazamientoEtapaProductiva_userId_idx"
  ON "AplazamientoEtapaProductiva"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AplazamientoEtapaProductiva_userId_fkey'
  ) THEN
    ALTER TABLE "AplazamientoEtapaProductiva"
      ADD CONSTRAINT "AplazamientoEtapaProductiva_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AplazamientoEtapaProductiva_avaladoPorId_fkey'
  ) THEN
    ALTER TABLE "AplazamientoEtapaProductiva"
      ADD CONSTRAINT "AplazamientoEtapaProductiva_avaladoPorId_fkey"
      FOREIGN KEY ("avaladoPorId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
