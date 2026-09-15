-- Avisos de plazo por correo (bitácoras y Momentos de evaluación): registro histórico y control
-- para no repetir el mismo aviso. Migración aditiva: un enum y una tabla nuevos.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TipoAvisoPlazo') THEN
    CREATE TYPE "TipoAvisoPlazo" AS ENUM ('PROXIMO', 'VENCIDO');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "AvisoPlazo" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "clave" TEXT NOT NULL,
  "tipo" "TipoAvisoPlazo" NOT NULL,
  "fechaLimite" TIMESTAMP(3) NOT NULL,
  "destinatarios" TEXT NOT NULL,
  "enviadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AvisoPlazo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AvisoPlazo_userId_clave_tipo_fechaLimite_key"
  ON "AvisoPlazo"("userId", "clave", "tipo", "fechaLimite");

CREATE INDEX IF NOT EXISTS "AvisoPlazo_userId_idx" ON "AvisoPlazo"("userId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AvisoPlazo_userId_fkey') THEN
    ALTER TABLE "AvisoPlazo"
      ADD CONSTRAINT "AvisoPlazo_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
