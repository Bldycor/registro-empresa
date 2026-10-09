-- Sucursales de las empresas co-formadoras (un NIT, varias sedes)
CREATE TABLE "SucursalEmpresa" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "departamento" TEXT NOT NULL,
    "municipio" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SucursalEmpresa_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SucursalEmpresa_empresaId_nombre_key" ON "SucursalEmpresa"("empresaId", "nombre");
CREATE INDEX "SucursalEmpresa_empresaId_idx" ON "SucursalEmpresa"("empresaId");
ALTER TABLE "SucursalEmpresa" ADD CONSTRAINT "SucursalEmpresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sede elegida por el aprendiz (vacío = sede principal)
ALTER TABLE "CompanyProfile" ADD COLUMN "sucursalId" TEXT;
CREATE INDEX "CompanyProfile_sucursalId_idx" ON "CompanyProfile"("sucursalId");
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "SucursalEmpresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
