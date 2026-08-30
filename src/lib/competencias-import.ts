import { ProgramasFormacionValues, type ProgramaFormacionValue } from "@/lib/validations";
import { claveEncabezado, normalizarCatalogo } from "@/lib/texto";

// Importador del catálogo de competencias/resultados de aprendizaje por programa (consolidado
// SENA). Igual que ficha-import.ts: acepta texto pegado desde Excel/Sheets (separado por
// tabulaciones), con o sin fila de encabezado. Con encabezado, las columnas se detectan por
// nombre, así que "seleccionar el rango completo del consolidado oficial y pegar" funciona tal
// cual — incluida la columna "Código del Programa", que se ignora a propósito: el programa se
// identifica por su nombre (Denominación de Formación), igual que en Ficha.programa.

export type ParsedCompetenciaRow = {
  linea: number;
  programa: ProgramaFormacionValue;
  tipo: "TECNICA" | "BASICA_CLAVE";
  codigoCompetencia: string;
  nombreCompetencia: string;
  resultadoAprendizaje: string;
  horas: number | null;
  redConocimiento: string | null;
};

export type CompetenciaImportError = { linea: number; motivo: string };

export type CompetenciaImportResult = {
  filas: ParsedCompetenciaRow[];
  errores: CompetenciaImportError[];
};

type CampoCompetencia =
  | "programa"
  | "tipo"
  | "codigoCompetencia"
  | "nombreCompetencia"
  | "resultadoAprendizaje"
  | "horas"
  | "redConocimiento"
  | "ignorar";

const MAPA_ENCABEZADOS: Record<string, CampoCompetencia> = {
  CODIGODELPROGRAMA: "ignorar",
  DENOMINACIONDEFORMACION: "programa",
  PROGRAMA: "programa",
  PROGRAMADEFORMACION: "programa",
  // La hoja oficial del SENA repite el valor de la columna como si fuera su propio encabezado.
  COMPETENCIATECNICAS: "tipo",
  TIPO: "tipo",
  TIPODECOMPETENCIA: "tipo",
  CODIGODECOMPETENCIA: "codigoCompetencia",
  CODIGOCOMPETENCIA: "codigoCompetencia",
  NOMBREDECOMPETENCIA: "nombreCompetencia",
  NOMBRECOMPETENCIA: "nombreCompetencia",
  RESULTADODEAPRENDIZAJE: "resultadoAprendizaje",
  HORASDECOMPETENCIA: "horas",
  HORAS: "horas",
  REDDECONOCIMIENTO: "redConocimiento",
  RED: "redConocimiento",
};

const ORDEN_SIN_ENCABEZADO: CampoCompetencia[] = [
  "ignorar",
  "programa",
  "tipo",
  "codigoCompetencia",
  "nombreCompetencia",
  "resultadoAprendizaje",
  "horas",
  "redConocimiento",
];

const PROGRAMA_MAP: Record<string, ProgramaFormacionValue> = Object.fromEntries(
  ProgramasFormacionValues.map((p) => [claveEncabezado(p), p])
) as Record<string, ProgramaFormacionValue>;

const TIPO_MAP: Record<string, "TECNICA" | "BASICA_CLAVE"> = {
  COMPETENCIATECNICAS: "TECNICA",
  COMPETENCIASTECNICAS: "TECNICA",
  TECNICA: "TECNICA",
  TECNICAS: "TECNICA",
  COMPETENCIASBASICASYOCLAVES: "BASICA_CLAVE",
  COMPETENCIABASICAYOCLAVE: "BASICA_CLAVE",
  BASICA: "BASICA_CLAVE",
  BASICAYOCLAVE: "BASICA_CLAVE",
  CLAVE: "BASICA_CLAVE",
};

function detectarDelimitador(lineas: string[]): string {
  if (lineas.some((l) => l.includes("\t"))) return "\t";
  if (lineas.some((l) => l.includes(";"))) return ";";
  return ",";
}

function parsearHoras(crudo: string): number | null {
  const texto = crudo.trim().replace(",", ".");
  if (!texto) return null;
  const numero = Number(texto);
  return Number.isFinite(numero) ? Math.round(numero) : null;
}

export function parseCompetenciasImportText(texto: string): CompetenciaImportResult {
  const lineas = texto
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lineas.length === 0) return { filas: [], errores: [] };

  const delimitador = detectarDelimitador(lineas);

  let columnas: CampoCompetencia[] = ORDEN_SIN_ENCABEZADO;
  let inicio = 0;

  const encabezadoDetectado = lineas[0]
    .split(delimitador)
    .some((celda) => claveEncabezado(celda) in MAPA_ENCABEZADOS);

  if (encabezadoDetectado) {
    columnas = lineas[0]
      .split(delimitador)
      .map((celda) => MAPA_ENCABEZADOS[claveEncabezado(celda)] ?? "ignorar");
    inicio = 1;
  }

  const filas: ParsedCompetenciaRow[] = [];
  const errores: CompetenciaImportError[] = [];

  for (let i = inicio; i < lineas.length; i++) {
    const numeroLinea = i + 1;
    const celdas = lineas[i].split(delimitador).map((c) => c.trim());

    const valores: Partial<Record<CampoCompetencia, string>> = {};
    columnas.forEach((campo, idx) => {
      if (campo === "ignorar") return;
      if (!(campo in valores)) valores[campo] = celdas[idx] ?? "";
    });

    const programa = normalizarCatalogo(valores.programa ?? "", PROGRAMA_MAP);
    if (!programa.reconocido) {
      errores.push({
        linea: numeroLinea,
        motivo: `Programa de formación no reconocido: "${valores.programa}".`,
      });
      continue;
    }
    if (!programa.valor) {
      errores.push({ linea: numeroLinea, motivo: "Falta el programa de formación." });
      continue;
    }

    const tipo = normalizarCatalogo(valores.tipo ?? "", TIPO_MAP);
    if (!tipo.reconocido) {
      errores.push({
        linea: numeroLinea,
        motivo: `Tipo de competencia no reconocido: "${valores.tipo}" (debe ser Técnica o Básica/Clave).`,
      });
      continue;
    }
    if (!tipo.valor) {
      errores.push({ linea: numeroLinea, motivo: "Falta el tipo de competencia." });
      continue;
    }

    const codigoCompetencia = (valores.codigoCompetencia ?? "").trim();
    const nombreCompetencia = (valores.nombreCompetencia ?? "").trim();
    const resultadoAprendizaje = (valores.resultadoAprendizaje ?? "").trim();

    if (!codigoCompetencia || !nombreCompetencia || !resultadoAprendizaje) {
      errores.push({
        linea: numeroLinea,
        motivo: "Falta código de competencia, nombre de competencia o resultado de aprendizaje.",
      });
      continue;
    }

    filas.push({
      linea: numeroLinea,
      programa: programa.valor,
      tipo: tipo.valor,
      codigoCompetencia,
      nombreCompetencia,
      resultadoAprendizaje,
      horas: parsearHoras(valores.horas ?? ""),
      redConocimiento: (valores.redConocimiento ?? "").trim() || null,
    });
  }

  return { filas, errores };
}
