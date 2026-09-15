-- Reunión extraordinaria (requisito §3.2): se registra quién la pidió. Aditiva: un enum y una
-- columna nullable; las evaluaciones existentes no cambian.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SolicitanteReunion') THEN
    CREATE TYPE "SolicitanteReunion" AS ENUM ('APRENDIZ', 'COFORMADOR');
  END IF;
END
$$;

ALTER TABLE "Evaluacion" ADD COLUMN IF NOT EXISTS "solicitadaPor" "SolicitanteReunion";
