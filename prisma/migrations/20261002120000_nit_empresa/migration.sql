-- NIT de la empresa co-formadora, que piden el formato GFPI-F-023 y la bitácora GFPI-F-147. Va en
-- el perfil de empresa, que es donde el aprendiz ya registra los demás datos del lugar de práctica.
-- Solo agrega.
ALTER TABLE "CompanyProfile" ADD COLUMN "nitEmpresa" TEXT;
