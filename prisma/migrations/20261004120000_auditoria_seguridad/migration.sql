-- Protección del ingreso
ALTER TABLE "User" ADD COLUMN "intentosFallidos" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "bloqueadoHasta" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "ultimoIngreso" TIMESTAMP(3);

-- Índices para las consultas más frecuentes
CREATE INDEX "User_fichaId_idx" ON "User"("fichaId");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "Ficha_instructorId_idx" ON "Ficha"("instructorId");
CREATE INDEX "BitacoraActividad_bitacoraId_idx" ON "BitacoraActividad"("bitacoraId");

-- Trazabilidad
CREATE TABLE "RegistroAuditoria" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,
    "usuarioNombre" TEXT,
    "rol" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "detalle" JSONB,
    "ip" TEXT,
    CONSTRAINT "RegistroAuditoria_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RegistroAuditoria_fecha_idx" ON "RegistroAuditoria"("fecha");
CREATE INDEX "RegistroAuditoria_usuarioId_fecha_idx" ON "RegistroAuditoria"("usuarioId", "fecha");
CREATE INDEX "RegistroAuditoria_entidad_entidadId_idx" ON "RegistroAuditoria"("entidad", "entidadId");
