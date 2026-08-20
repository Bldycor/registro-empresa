-- Modalidad ("alternativa") de Etapa Productiva del aprendiz: Contrato de aprendizaje, Contrato
-- vínculo formativo, Monitoría, Proyecto productivo, Vínculo laboral.

-- CreateEnum
CREATE TYPE "AlternativaEtapaProductiva" AS ENUM ('CONTRATO_APRENDIZAJE', 'CONTRATO_VINCULO_FORMATIVO', 'MONITORIA', 'PROYECTO_PRODUCTIVO', 'VINCULO_LABORAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "alternativaEtapaProductiva" "AlternativaEtapaProductiva";
