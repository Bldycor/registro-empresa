// Valoración del Momento 1 (Concertación/Planeación): 5 variables sobre la calidad de la
// planeación acordada con el aprendiz y el coformador — no forman parte del formato GFPI-F-023
// (que no valora este momento), pero el instructor las evalúa con la misma escala
// Satisfactorio/Por mejorar que las rúbricas de los Momentos 2 y 3.
import type { VariablePlaneacionEP } from "@/generated/prisma/enums";

export const VARIABLES_PLANEACION = [
  "COMPETENCIAS_RESULTADOS_DEFINIDOS",
  "ACTIVIDADES_EVIDENCIAS_PLANTEADAS",
  "AFILIACION_ARL",
  "HORARIO_ACORDADO",
  "PARTICIPACION_COFORMADOR",
] as const satisfies readonly VariablePlaneacionEP[];

export const variablePlaneacionLabel: Record<VariablePlaneacionEP, string> = {
  COMPETENCIAS_RESULTADOS_DEFINIDOS:
    "Competencias y resultados de aprendizaje definidos con claridad",
  ACTIVIDADES_EVIDENCIAS_PLANTEADAS: "Actividades y evidencias de aprendizaje bien planteadas",
  AFILIACION_ARL: "Afiliación a la ARL registrada (si aplica)",
  HORARIO_ACORDADO: "Horario de la Etapa Productiva acordado",
  PARTICIPACION_COFORMADOR: "Participación y compromiso del ente co-formador",
};
