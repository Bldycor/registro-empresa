import { prisma } from "@/lib/prisma";

// Las competencias y los resultados de aprendizaje SOLO existen si Coordinación de Etapa
// Productiva los cargó al catálogo del programa (`CompetenciaFormacion`, pantalla
// «Competencias»). Nadie los escribe a mano: el aprendiz y el instructor únicamente eligen de ese
// catálogo (decisión de Coordinación, 2 oct 2026).
//
// Este es el control del lado del servidor, para que la regla no dependa de la pantalla: se
// aplica al plan de trabajo del Momento 1 (aprendiz e instructor) y a las actividades de las
// bitácoras.

export type CatalogoPrograma = {
  programa: string | null;
  competencias: Set<string>;
  resultados: Set<string>;
  // Resultado → competencia a la que pertenece.
  competenciaDe: Map<string, string>;
};

export async function catalogoDelAprendiz(userId: string): Promise<CatalogoPrograma> {
  const aprendiz = await prisma.user.findUnique({
    where: { id: userId },
    select: { ficha: { select: { programa: true } } },
  });
  const programa = aprendiz?.ficha?.programa ?? null;
  const filas = programa
    ? await prisma.competenciaFormacion.findMany({
        where: { programa },
        select: { nombreCompetencia: true, resultadoAprendizaje: true },
      })
    : [];
  return {
    programa,
    competencias: new Set(filas.map((f) => f.nombreCompetencia)),
    resultados: new Set(filas.map((f) => f.resultadoAprendizaje)),
    competenciaDe: new Map(filas.map((f) => [f.resultadoAprendizaje, f.nombreCompetencia])),
  };
}

function lineas(texto: string | null | undefined): string[] {
  return (texto ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

// Lo que ya estaba guardado antes de esta regla se respeta: no se pierde ni bloquea el resto del
// formato. Solo lo NUEVO debe venir del catálogo.
export type YaGuardado = { competencias?: string | null; resultados?: string | null };

// Plan de trabajo (texto, una por línea). Devuelve el primer problema en palabras, o null.
export function problemaEnPlan(
  catalogo: CatalogoPrograma,
  competenciasTexto: string | null | undefined,
  resultadosTexto: string | null | undefined,
  yaGuardado: YaGuardado = {},
): string | null {
  const compsPrevias = new Set(lineas(yaGuardado.competencias));
  const rasPrevios = new Set(lineas(yaGuardado.resultados));
  const comps = lineas(competenciasTexto);
  const ras = lineas(resultadosTexto);
  const compsNuevas = comps.filter((c) => !compsPrevias.has(c));
  const rasNuevos = ras.filter((r) => !rasPrevios.has(r));
  if (compsNuevas.length === 0 && rasNuevos.length === 0) return null;

  if (catalogo.competencias.size === 0) {
    return catalogo.programa
      ? `El programa «${catalogo.programa}» todavía no tiene competencias cargadas. Coordinación de Etapa Productiva debe cargarlas antes de elegirlas.`
      : "El aprendiz no tiene ficha con programa asignado, así que no hay competencias para elegir.";
  }
  const compAjena = compsNuevas.find((c) => !catalogo.competencias.has(c));
  if (compAjena) {
    return `«${compAjena}» no es una competencia cargada para este programa. Elígela de la lista.`;
  }
  const raAjeno = rasNuevos.find((r) => !catalogo.resultados.has(r));
  if (raAjeno) {
    return `«${raAjeno}» no es un resultado de aprendizaje cargado para este programa. Elígelo de la lista.`;
  }
  // Cada resultado debe ir con su competencia.
  const sinSuCompetencia = rasNuevos.find((r) => !comps.includes(catalogo.competenciaDe.get(r) ?? ""));
  if (sinSuCompetencia) {
    return `El resultado «${sinSuCompetencia}» pertenece a una competencia que no está en el plan.`;
  }
  return null;
}

// Competencia de una actividad de bitácora (una sola). Vacía se acepta, y también la que esa
// misma bitácora ya tenía guardada.
export function problemaEnCompetencia(
  catalogo: CatalogoPrograma,
  competencia: string | null | undefined,
  yaGuardadas: Set<string> = new Set(),
): string | null {
  const c = (competencia ?? "").trim();
  if (!c || yaGuardadas.has(c)) return null;
  if (catalogo.competencias.size === 0) {
    return "Tu programa todavía no tiene competencias cargadas: deja ese campo vacío hasta que Coordinación las cargue.";
  }
  return catalogo.competencias.has(c)
    ? null
    : `«${c}» no es una competencia cargada para tu programa. Elige una de la lista.`;
}
