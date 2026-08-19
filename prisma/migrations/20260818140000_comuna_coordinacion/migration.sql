-- Separación del registro por rol (Aprendiz / Coordinador se autoregistran por separado;
-- Instructor lo crea el Coordinador) y nuevos campos de ubicación (comuna) y área (coordinación).

-- CreateEnum
CREATE TYPE "Comuna" AS ENUM ('POPULAR', 'SANTA_CRUZ', 'MANRIQUE', 'ARANJUEZ', 'CASTILLA', 'DOCE_DE_OCTUBRE', 'ROBLEDO', 'VILLA_HERMOSA', 'BUENOS_AIRES', 'LA_CANDELARIA', 'LAURELES_ESTADIO', 'LA_AMERICA', 'SAN_JAVIER', 'EL_POBLADO', 'GUAYABAL', 'BELEN');

-- CreateEnum
CREATE TYPE "Coordinacion" AS ENUM ('CONTABILIDAD_FINANZAS', 'COMERCIO_VENTAS', 'GESTION_ADMINISTRATIVA_DOCUMENTAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "comuna" "Comuna";
ALTER TABLE "User" ADD COLUMN "coordinacion" "Coordinacion";
