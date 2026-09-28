-- Plan de mejoramiento (guía GFPI-G-040 §9.4 y reglamento del aprendiz, Acuerdo 009 de 2024):
-- medida formativa académica cuando el aprendiz no supera resultados de aprendizaje en alguno de
-- los tres Momentos de evaluación. Lo redacta el instructor, lo autoriza el coordinador académico
-- —esa autorización es la suscripción, y de ahí arranca el plazo— y lo verifica el instructor.
-- No requiere acta. Solo agrega.
CREATE TYPE "EstadoPlanMejoramiento" AS ENUM (
  'POR_AUTORIZAR',
  'VIGENTE',
  'CUMPLIDO',
  'NO_CUMPLIDO',
  'DEVUELTO'
);

CREATE TABLE "PlanMejoramiento" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "momento" INTEGER NOT NULL,
  "resultadosNoSuperados" TEXT NOT NULL,
  "actividades" TEXT NOT NULL,
  "evidencias" TEXT NOT NULL,
  "llamadosPrevios" TEXT NOT NULL,
  "diasPlazo" INTEGER NOT NULL,
  "fechaLimite" TIMESTAMP(3),
  "estado" "EstadoPlanMejoramiento" NOT NULL DEFAULT 'POR_AUTORIZAR',
  "creadoPorId" TEXT,
  "autorizadoPorId" TEXT,
  "fechaAutorizacion" TIMESTAMP(3),
  "observacionesCoordinacion" TEXT,
  "cerradoPorId" TEXT,
  "fechaCierre" TIMESTAMP(3),
  "verificacion" TEXT,
  "soporteUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlanMejoramiento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlanMejoramiento_userId_idx" ON "PlanMejoramiento"("userId");

ALTER TABLE "PlanMejoramiento"
  ADD CONSTRAINT "PlanMejoramiento_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlanMejoramiento"
  ADD CONSTRAINT "PlanMejoramiento_creadoPorId_fkey"
  FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlanMejoramiento"
  ADD CONSTRAINT "PlanMejoramiento_autorizadoPorId_fkey"
  FOREIGN KEY ("autorizadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlanMejoramiento"
  ADD CONSTRAINT "PlanMejoramiento_cerradoPorId_fkey"
  FOREIGN KEY ("cerradoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
