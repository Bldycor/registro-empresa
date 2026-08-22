-- CreateEnum
CREATE TYPE "SubtipoAlternativaEtapaProductiva" AS ENUM ('CONTRATO_APRENDIZAJE_REGULAR', 'CONTRATO_APRENDIZAJE_ECONOMIA_POPULAR_CAMPESINA', 'CONTRATO_APRENDIZAJE_GRUPO_INVESTIGACION', 'VINCULO_FORMATIVO_ASESORIA_PYMES', 'VINCULO_FORMATIVO_APOYO_UNIDAD_PRODUCTIVA_FAMILIAR', 'VINCULO_FORMATIVO_APOYO_INSTITUCION_ESTATAL_ONG', 'VINCULO_FORMATIVO_GRUPO_INVESTIGACION', 'VINCULO_FORMATIVO_ECONOMIA_POPULAR_CAMPESINA', 'MONITORIA_REGULAR', 'MONITORIA_GRUPO_INVESTIGACION', 'PROYECTO_SENA_EMPRESA', 'PROYECTO_SENA_PROVEEDOR_SENA', 'PROYECTO_PRODUCCION_CENTROS', 'PROYECTO_ENFOQUE_EMPRESARIAL', 'PROYECTO_ENFOQUE_IDI', 'PROYECTO_RUTA_EMPRENDEDORA', 'PROYECTO_ECONOMIA_POPULAR_CAMPESINA', 'VINCULO_LABORAL_REGULAR', 'VINCULO_LABORAL_ECONOMIA_POPULAR_CAMPESINA');

-- CreateEnum
CREATE TYPE "TipoSolicitudAlternativa" AS ENUM ('SELECCION', 'MODIFICACION');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('CC', 'TI', 'NUIP', 'CE', 'PEP', 'OTRO');

-- CreateEnum
CREATE TYPE "ModalidadFormacion" AS ENUM ('PRESENCIAL', 'VIRTUAL', 'A_DISTANCIA');

-- CreateEnum
CREATE TYPE "ModalidadEjecucionEP" AS ENUM ('PRESENCIAL', 'VIRTUAL');

-- CreateEnum
CREATE TYPE "NivelRiesgoARL" AS ENUM ('I', 'II', 'III', 'IV', 'V');

-- CreateEnum
CREATE TYPE "TipoDiscapacidad" AS ENUM ('AUDITIVA', 'VISUAL', 'MOTORA', 'COGNITIVA', 'MULTIPLE');

-- CreateEnum
CREATE TYPE "CategoriaVariableEvaluacion" AS ENUM ('TECNICO', 'ACTITUDINAL');

-- CreateEnum
CREATE TYPE "VariableEvaluacion" AS ENUM ('APLICACION_CONOCIMIENTO', 'MEJORA_CONTINUA', 'FORTALECIMIENTO_OCUPACIONAL', 'OPORTUNIDAD_CALIDAD', 'RESPONSABILIDAD_AMBIENTAL', 'ADMINISTRACION_RECURSOS', 'SEGURIDAD_SALUD_TRABAJO', 'DOCUMENTACION_ETAPA_PRODUCTIVA', 'RELACIONES_INTERPERSONALES', 'TRABAJO_EQUIPO', 'SOLUCION_PROBLEMAS', 'CUMPLIMIENTO', 'ORGANIZACION');

-- CreateEnum
CREATE TYPE "ValoracionVariable" AS ENUM ('SATISFACTORIO', 'POR_MEJORAR');

-- CreateEnum
CREATE TYPE "JuicioEtapaProductiva" AS ENUM ('APROBADO', 'NO_APROBADO');

-- DropIndex
DROP INDEX "Evaluacion_userId_numero_key";

-- AlterTable
ALTER TABLE "Bitacora" ADD COLUMN     "arlAfiliado" BOOLEAN,
ADD COLUMN     "arlNivelRiesgo" "NivelRiesgoARL",
ADD COLUMN     "arlRiesgoCorresponde" BOOLEAN,
ADD COLUMN     "arlTieneEPP" BOOLEAN,
ADD COLUMN     "avaladoPorId" TEXT,
ADD COLUMN     "fechaAval" TIMESTAMP(3),
ADD COLUMN     "periodoDesde" TIMESTAMP(3),
ADD COLUMN     "periodoHasta" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CertificacionEmpresario" ADD COLUMN     "avaladoPorId" TEXT,
ADD COLUMN     "fechaAval" TIMESTAMP(3),
ADD COLUMN     "observaciones" TEXT;

-- AlterTable
ALTER TABLE "ConcertacionFuncion" ADD COLUMN     "actividadesDesarrollar" TEXT,
ADD COLUMN     "arlFechaAfiliacion" TIMESTAMP(3),
ADD COLUMN     "arlNumeroPoliza" TEXT,
ADD COLUMN     "competenciasDesarrollar" TEXT,
ADD COLUMN     "enlaceGrabacion" TEXT,
ADD COLUMN     "evidenciasAprendizaje" TEXT,
ADD COLUMN     "horario" TEXT,
ADD COLUMN     "observacionesAdicionales" TEXT,
ADD COLUMN     "resultadosAprendizaje" TEXT;

-- AlterTable
ALTER TABLE "Evaluacion" ADD COLUMN     "avaladoPorId" TEXT,
ADD COLUMN     "enlaceGrabacion" TEXT,
ADD COLUMN     "esExtraordinario" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estado" "EstadoEvidencia" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "fechaAval" TIMESTAMP(3),
ADD COLUMN     "juicioFinal" "JuicioEtapaProductiva",
ADD COLUMN     "modalidad" "ModalidadEjecucionEP",
ADD COLUMN     "motivoExtraordinario" TEXT,
ADD COLUMN     "retroalimentacionAprendiz" TEXT,
ADD COLUMN     "retroalimentacionCoformador" TEXT,
ADD COLUMN     "retroalimentacionInstructor" TEXT;

-- AlterTable
ALTER TABLE "Ficha" ADD COLUMN     "modalidadFormacion" "ModalidadFormacion";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ciudad" TEXT,
ADD COLUMN     "departamento" TEXT,
ADD COLUMN     "enSituacionDiscapacidad" BOOLEAN,
ADD COLUMN     "fechaFinEtapaProductiva" TIMESTAMP(3),
ADD COLUMN     "modalidadEjecucionEP" "ModalidadEjecucionEP",
ADD COLUMN     "nombreAsistenteDiscapacidad" TEXT,
ADD COLUMN     "paisEtapaProductiva" TEXT,
ADD COLUMN     "realizaEnExterior" BOOLEAN,
ADD COLUMN     "subtipoAlternativaEtapaProductiva" "SubtipoAlternativaEtapaProductiva",
ADD COLUMN     "telefonoAsistenteDiscapacidad" TEXT,
ADD COLUMN     "tipoDiscapacidad" "TipoDiscapacidad",
ADD COLUMN     "tipoDocumento" "TipoDocumento";

-- CreateTable
CREATE TABLE "SeleccionAlternativaEP" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipoSolicitud" "TipoSolicitudAlternativa" NOT NULL,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL,
    "alternativa" "AlternativaEtapaProductiva" NOT NULL,
    "subtipoAlternativa" "SubtipoAlternativaEtapaProductiva",
    "fechaInicioEjecucion" TIMESTAMP(3),
    "fechaFinEjecucion" TIMESTAMP(3),
    "archivoUrl" TEXT,
    "estado" "EstadoEvidencia" NOT NULL DEFAULT 'PENDIENTE',
    "avaladoPorId" TEXT,
    "fechaAval" TIMESTAMP(3),
    "observacionesAval" TEXT,
    "grupoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeleccionAlternativaEP_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeleccionAlternativaGrupo" (
    "id" TEXT NOT NULL,
    "fichaId" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeleccionAlternativaGrupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormalizacionEtapaProductiva" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipoDocumento" TEXT NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoEvidencia" NOT NULL DEFAULT 'PENDIENTE',
    "avaladoPorId" TEXT,
    "fechaAval" TIMESTAMP(3),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormalizacionEtapaProductiva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluacionVariable" (
    "id" TEXT NOT NULL,
    "evaluacionId" TEXT NOT NULL,
    "categoria" "CategoriaVariableEvaluacion" NOT NULL,
    "variable" "VariableEvaluacion" NOT NULL,
    "valoracion" "ValoracionVariable",
    "observaciones" TEXT,

    CONSTRAINT "EvaluacionVariable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BitacoraActividad" (
    "id" TEXT NOT NULL,
    "bitacoraId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "competencias" TEXT,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "evidenciaCumplimiento" TEXT,
    "observaciones" TEXT,

    CONSTRAINT "BitacoraActividad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeleccionAlternativaEP_userId_idx" ON "SeleccionAlternativaEP"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FormalizacionEtapaProductiva_userId_key" ON "FormalizacionEtapaProductiva"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluacionVariable_evaluacionId_variable_key" ON "EvaluacionVariable"("evaluacionId", "variable");

-- CreateIndex
CREATE INDEX "Evaluacion_userId_numero_idx" ON "Evaluacion"("userId", "numero");

-- AddForeignKey
ALTER TABLE "SeleccionAlternativaEP" ADD CONSTRAINT "SeleccionAlternativaEP_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeleccionAlternativaEP" ADD CONSTRAINT "SeleccionAlternativaEP_avaladoPorId_fkey" FOREIGN KEY ("avaladoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeleccionAlternativaEP" ADD CONSTRAINT "SeleccionAlternativaEP_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "SeleccionAlternativaGrupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeleccionAlternativaGrupo" ADD CONSTRAINT "SeleccionAlternativaGrupo_fichaId_fkey" FOREIGN KEY ("fichaId") REFERENCES "Ficha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeleccionAlternativaGrupo" ADD CONSTRAINT "SeleccionAlternativaGrupo_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormalizacionEtapaProductiva" ADD CONSTRAINT "FormalizacionEtapaProductiva_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormalizacionEtapaProductiva" ADD CONSTRAINT "FormalizacionEtapaProductiva_avaladoPorId_fkey" FOREIGN KEY ("avaladoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluacion" ADD CONSTRAINT "Evaluacion_avaladoPorId_fkey" FOREIGN KEY ("avaladoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluacionVariable" ADD CONSTRAINT "EvaluacionVariable_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "Evaluacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bitacora" ADD CONSTRAINT "Bitacora_avaladoPorId_fkey" FOREIGN KEY ("avaladoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BitacoraActividad" ADD CONSTRAINT "BitacoraActividad_bitacoraId_fkey" FOREIGN KEY ("bitacoraId") REFERENCES "Bitacora"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificacionEmpresario" ADD CONSTRAINT "CertificacionEmpresario_avaladoPorId_fkey" FOREIGN KEY ("avaladoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

