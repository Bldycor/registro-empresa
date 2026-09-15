-- Reglamento del aprendiz por ficha: define si aplica el plazo de 24 meses del Acuerdo 007 de 2012.
CREATE TYPE "ReglamentoAprendiz" AS ENUM ('ACUERDO_007_2012', 'ACUERDO_009_2024');
ALTER TABLE "Ficha" ADD COLUMN "reglamento" "ReglamentoAprendiz";
