-- Permite registrar Instructores y Coordinadores sin código de ficha (solo aplica a Aprendices).
ALTER TABLE "User" ALTER COLUMN "codigoFicha" DROP NOT NULL;
