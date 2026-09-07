-- Cuántas bitácoras le corresponden a cada aprendiz (12 por defecto, quincenales durante 6
-- meses; una Etapa Productiva más corta puede necesitar solo 6). Lo corrige el instructor,
-- individualmente o para toda una ficha.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "totalBitacoras" INTEGER NOT NULL DEFAULT 12;
