-- Guía GFPI-G-040 §9.1.1 (requisitos para el aval) y §9.1.2 (registro en SofiaPlus).
-- Migración aditiva: solo columnas nullable. Nada de lo existente cambia de valor.

-- Requisitos de aval verificados por Coordinación sobre el aprendiz.
-- NULL = sin verificar todavía (distinto de false = verificado y no cumple).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fechaNacimiento" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "rapsEtapaLectivaAprobados" BOOLEAN;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "autorizacionMinTrabajoUrl" TEXT;

-- Constancia de aval con requisitos sin verificar, y registro en SofiaPlus.
ALTER TABLE "SeleccionAlternativaEP" ADD COLUMN IF NOT EXISTS "requisitosOmitidos" TEXT;
ALTER TABLE "SeleccionAlternativaEP" ADD COLUMN IF NOT EXISTS "registroSofiaPlus" TIMESTAMP(3);
