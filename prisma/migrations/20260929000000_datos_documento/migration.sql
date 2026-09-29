-- Datos leídos del formato GFPI-F-023 que adjunta el aprendiz: rellenan lo que el sistema no sabe,
-- sin pisar ningún dato propio. Solo agrega.
ALTER TABLE "DatosFormatoEP" ADD COLUMN "datosDocumento" JSONB;
ALTER TABLE "DatosFormatoEP" ADD COLUMN "documentoLeidoEn" TIMESTAMP(3);
