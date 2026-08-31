// Rúbrica real del formato GFPI-F-023: 13 variables fijas (8 técnicas + 5 actitudinales),
// cada una valorada Satisfactorio/Por mejorar. Reemplaza la convención A/D/P de Fase 0 (sin uso
// real) para los Momentos 2 y 3 — ver docs/REQUISITOS-FUNCIONALES.md sección 3.4.
import type { CategoriaVariableEvaluacion, VariableEvaluacion } from "@/generated/prisma/enums";

export const VARIABLES_TECNICAS: VariableEvaluacion[] = [
  "APLICACION_CONOCIMIENTO",
  "MEJORA_CONTINUA",
  "FORTALECIMIENTO_OCUPACIONAL",
  "OPORTUNIDAD_CALIDAD",
  "RESPONSABILIDAD_AMBIENTAL",
  "ADMINISTRACION_RECURSOS",
  "SEGURIDAD_SALUD_TRABAJO",
  "DOCUMENTACION_ETAPA_PRODUCTIVA",
];

export const VARIABLES_ACTITUDINALES: VariableEvaluacion[] = [
  "RELACIONES_INTERPERSONALES",
  "TRABAJO_EQUIPO",
  "SOLUCION_PROBLEMAS",
  "CUMPLIMIENTO",
  "ORGANIZACION",
];

export const TODAS_LAS_VARIABLES: VariableEvaluacion[] = [
  ...VARIABLES_TECNICAS,
  ...VARIABLES_ACTITUDINALES,
];

export const variableCategoria: Record<VariableEvaluacion, CategoriaVariableEvaluacion> =
  Object.fromEntries([
    ...VARIABLES_TECNICAS.map((v) => [v, "TECNICO"] as const),
    ...VARIABLES_ACTITUDINALES.map((v) => [v, "ACTITUDINAL"] as const),
  ]) as Record<VariableEvaluacion, CategoriaVariableEvaluacion>;

export const variableLabel: Record<VariableEvaluacion, string> = {
  APLICACION_CONOCIMIENTO: "Aplicación del conocimiento técnico y tecnológico",
  MEJORA_CONTINUA: "Mejora continua de procesos",
  FORTALECIMIENTO_OCUPACIONAL: "Fortalecimiento de la ocupación",
  OPORTUNIDAD_CALIDAD: "Oportunidad y calidad en los resultados",
  RESPONSABILIDAD_AMBIENTAL: "Responsabilidad ambiental",
  ADMINISTRACION_RECURSOS: "Administración de recursos",
  SEGURIDAD_SALUD_TRABAJO: "Seguridad y salud en el trabajo",
  DOCUMENTACION_ETAPA_PRODUCTIVA: "Documentación de la Etapa Productiva",
  RELACIONES_INTERPERSONALES: "Relaciones interpersonales",
  TRABAJO_EQUIPO: "Trabajo en equipo",
  SOLUCION_PROBLEMAS: "Solución de problemas",
  CUMPLIMIENTO: "Cumplimiento",
  ORGANIZACION: "Organización",
};

export const categoriaLabel: Record<CategoriaVariableEvaluacion, string> = {
  TECNICO: "Técnicas",
  ACTITUDINAL: "Actitudinales",
};
