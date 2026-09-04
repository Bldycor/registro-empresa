-- Nuevo estado intermedio del aprendiz: POR_CERTIFICAR. Lo marca el instructor uno a uno desde
-- el panel de Seguimiento, solo cuando las 6 evidencias de Etapa Productiva ya quedaron
-- avaladas/aprobadas — dispara el correo con la ficha de requisitos institucionales de
-- certificación. Coordinación ve estos aprendices y hace el paso final a CERTIFICADO.

-- AlterEnum
ALTER TYPE "EstadoAprendiz" ADD VALUE 'POR_CERTIFICAR';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "porCertificarPorId" TEXT,
ADD COLUMN     "fechaPorCertificar" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_porCertificarPorId_fkey" FOREIGN KEY ("porCertificarPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
