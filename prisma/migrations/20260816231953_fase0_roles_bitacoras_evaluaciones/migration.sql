-- CreateEnum
CREATE TYPE "Role" AS ENUM ('APRENDIZ', 'INSTRUCTOR', 'COORDINADOR');

-- CreateEnum
CREATE TYPE "EstadoAprendiz" AS ENUM ('ACTIVO', 'CERTIFICADO');

-- CreateEnum
CREATE TYPE "Calificacion" AS ENUM ('A', 'D', 'P');

-- CreateEnum
CREATE TYPE "EstadoEvidencia" AS ENUM ('PENDIENTE', 'SUBIDA_A_TIEMPO', 'SUBIDA_CON_ATRASO', 'APROBADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "celular" TEXT NOT NULL,
    "direccionResidencia" TEXT NOT NULL,
    "codigoFicha" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'APRENDIZ',
    "estado" "EstadoAprendiz" NOT NULL DEFAULT 'ACTIVO',
    "fechaInicioEtapaProductiva" TIMESTAMP(3),
    "instructorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "empresaPatrocinadora" TEXT NOT NULL,
    "direccionEmpresa" TEXT NOT NULL,
    "nombreCoformador" TEXT NOT NULL,
    "cargoCoformador" TEXT NOT NULL,
    "correoCoformador" TEXT NOT NULL,
    "celularCoformador" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConcertacionFuncion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "videollamadaUrl" TEXT,
    "googleEventId" TEXT,
    "calificacion" "Calificacion",
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConcertacionFuncion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluacion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3),
    "horaInicio" TEXT,
    "horaFin" TEXT,
    "videollamadaUrl" TEXT,
    "googleEventId" TEXT,
    "calificacion" "Calificacion",
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bitacora" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "fechaLimite" TIMESTAMP(3) NOT NULL,
    "fechaEntrega" TIMESTAMP(3),
    "archivoUrl" TEXT,
    "estado" "EstadoEvidencia" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificacionEmpresario" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "archivoUrl" TEXT,
    "fecha" TIMESTAMP(3),
    "estado" "EstadoEvidencia" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificacionEmpresario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_cedula_key" ON "User"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_userId_key" ON "CompanyProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConcertacionFuncion_userId_key" ON "ConcertacionFuncion"("userId");

-- CreateIndex
CREATE INDEX "ConcertacionFuncion_fecha_idx" ON "ConcertacionFuncion"("fecha");

-- CreateIndex
CREATE INDEX "Evaluacion_fecha_idx" ON "Evaluacion"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "Evaluacion_userId_numero_key" ON "Evaluacion"("userId", "numero");

-- CreateIndex
CREATE INDEX "Bitacora_fechaLimite_idx" ON "Bitacora"("fechaLimite");

-- CreateIndex
CREATE UNIQUE INDEX "Bitacora_userId_numero_key" ON "Bitacora"("userId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "CertificacionEmpresario_userId_key" ON "CertificacionEmpresario"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConcertacionFuncion" ADD CONSTRAINT "ConcertacionFuncion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluacion" ADD CONSTRAINT "Evaluacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bitacora" ADD CONSTRAINT "Bitacora_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificacionEmpresario" ADD CONSTRAINT "CertificacionEmpresario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
