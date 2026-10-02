-- Catálogo de empresas co-formadoras: una empresa = un NIT, administrado solo por el ADMIN. Los
-- perfiles de empresa de los aprendices se enlazan a él. Solo agrega: los perfiles existentes
-- quedan sin enlazar hasta que el administrador registre su empresa.
CREATE TABLE "Empresa" (
  "id" TEXT NOT NULL,
  "nit" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "direccion" TEXT NOT NULL,
  "creadoPorId" TEXT,
  "actualizadoPorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Empresa_nit_key" ON "Empresa"("nit");

ALTER TABLE "Empresa"
  ADD CONSTRAINT "Empresa_creadoPorId_fkey"
  FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Empresa"
  ADD CONSTRAINT "Empresa_actualizadoPorId_fkey"
  FOREIGN KEY ("actualizadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompanyProfile" ADD COLUMN "empresaId" TEXT;
CREATE INDEX "CompanyProfile_empresaId_idx" ON "CompanyProfile"("empresaId");
ALTER TABLE "CompanyProfile"
  ADD CONSTRAINT "CompanyProfile_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
