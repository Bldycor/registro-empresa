-- Separa la variable combinada "Actividades y evidencias de aprendizaje bien planteadas" en dos
-- variables independientes, para que el instructor pueda valorar cada una por separado.

-- AlterEnum
ALTER TYPE "VariablePlaneacionEP" RENAME VALUE 'ACTIVIDADES_EVIDENCIAS_PLANTEADAS' TO 'ACTIVIDADES_PLANTEADAS';
ALTER TYPE "VariablePlaneacionEP" ADD VALUE 'EVIDENCIAS_PLANTEADAS' AFTER 'ACTIVIDADES_PLANTEADAS';
