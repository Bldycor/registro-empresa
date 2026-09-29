-- Toda etapa productiva son SEIS bitácoras, una por cada mes de los seis de práctica (decisión de
-- Coordinación, 29 sep 2026). Se elimina la opción de 12 cada 15 días y los procesos que la tenían
-- pasan a 6. Las bitácoras ya entregadas NO se tocan: las que quedaron por encima de la sexta
-- siguen en el expediente del aprendiz como constancia de lo que entregó.
ALTER TABLE "User" ALTER COLUMN "totalBitacoras" SET DEFAULT 6;

UPDATE "User" SET "totalBitacoras" = 6 WHERE role = 'APRENDIZ' AND "totalBitacoras" <> 6;
