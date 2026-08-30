import {
  EstadoFichaValues,
  NivelFormacionValues,
  JornadaValues,
  ProgramasFormacionValues,
  type EstadoFichaValue,
  type NivelFormacionValue,
  type JornadaValue,
  type ProgramaFormacionValue,
} from "@/lib/validations";
import { calcularFechasFicha } from "@/lib/ficha-fechas";
import { claveEncabezado, normalizarCatalogo } from "@/lib/texto";

// Importador de fichas desde el control institucional en hoja de cálculo. Acepta texto pegado
// desde Google Sheets/Excel (separado por tabulaciones) con o sin fila de encabezado — si hay
// encabezado, las columnas se detectan por nombre (para que un "seleccionar A1:J... y pegar"
// funcione tal cual, incluyendo las columnas que se ignoran a propósito: vigencia de acuerdo
// 007/009, y también INICIO PRODUCTIVA / Límite para Iniciar EP, que ya no se toman literales
// de la hoja — se recalculan con la fórmula oficial, ver src/lib/ficha-fechas.ts). Sin
// encabezado, asume el orden fijo: código, estado, nivel, jornada, fechaInicioFicha,
// fechaFinFormacion.

export type ParsedFichaRow = {
  linea: number;
  codigo: string;
  programa: ProgramaFormacionValue | null;
  estado: EstadoFichaValue | null;
  nivelFormacion: NivelFormacionValue | null;
  jornada: JornadaValue | null;
  fechaInicioFicha: Date | null;
  fechaInicioProductiva: Date | null;
  fechaFinFormacion: Date | null;
  fechaLimiteIniciarEP: Date | null;
};

export type FichaImportError = { linea: number; motivo: string };

export type FichaImportResult = {
  filas: ParsedFichaRow[];
  errores: FichaImportError[];
};

type CampoFicha =
  | "codigo"
  | "programa"
  | "estado"
  | "nivelFormacion"
  | "jornada"
  | "fechaInicioFicha"
  | "fechaFinFormacion"
  | "ignorar";

const MAPA_ENCABEZADOS: Record<string, CampoFicha> = {
  FICHA: "codigo",
  CODIGO: "codigo",
  PROGRAMA: "programa",
  PROGRAMADEFORMACION: "programa",
  PROGRAMASDEFORMACION: "programa",
  ESTADO: "estado",
  NIVELDEFORMACION: "nivelFormacion",
  NIVELFORMACION: "nivelFormacion",
  JORNADA: "jornada",
  // Variantes reales de encabezado: con o sin el prefijo "FECHA" (la hoja de control a veces
  // solo dice "INICIO FICHA" / "FIN DE FORMACIÓN", sin repetir la palabra "FECHA").
  FECHAINICIOFICHA: "fechaInicioFicha",
  INICIOFICHA: "fechaInicioFicha",
  FECHADEFINDEFORMACION: "fechaFinFormacion",
  FECHAFINDEFORMACION: "fechaFinFormacion",
  FINDEFORMACION: "fechaFinFormacion",
  FINFORMACION: "fechaFinFormacion",
  // Se ignoran a propósito: las de vigencia no se modelan, e INICIO PRODUCTIVA / Límite para
  // Iniciar EP ya no se toman literales — se recalculan con la fórmula oficial.
  INICIOPRODUCTIVA: "ignorar",
  LIMITEPARAINICIAREP: "ignorar",
  VIGENCIADELAFICHAACUERDO007: "ignorar",
  VIGENCIADELAFICHAACUERDO009: "ignorar",
};

const ORDEN_SIN_ENCABEZADO: CampoFicha[] = [
  "codigo",
  "programa",
  "estado",
  "nivelFormacion",
  "jornada",
  "fechaInicioFicha",
  "fechaFinFormacion",
];

const ESTADO_MAP: Record<string, EstadoFichaValue> = {
  ENEJECUCION: "EN_EJECUCION",
  TERMINADA: "TERMINADA",
  TERMINADAPORFECHA: "TERMINADA_POR_FECHA",
};

const NIVEL_MAP: Record<string, NivelFormacionValue> = {
  TECNICO: "TECNICO",
  TECNOLOGO: "TECNOLOGO",
  AUXILIAR: "AUXILIAR",
};

const JORNADA_MAP: Record<string, JornadaValue> = {
  MANANA: "MANANA",
  TARDE: "TARDE",
  NOCHE: "NOCHE",
  MIXTA: "MIXTA",
  VIRTUAL: "VIRTUAL",
  TARDENOCHE: "TARDE_NOCHE",
};

const PROGRAMA_MAP: Record<string, ProgramaFormacionValue> = Object.fromEntries(
  ProgramasFormacionValues.map((p) => [claveEncabezado(p), p])
) as Record<string, ProgramaFormacionValue>;

// Fechas en formato colombiano D/M/YYYY o DD/MM/YYYY. Blanco o "0" (como en las columnas de
// vigencia de acuerdo, cuando no aplica) se interpreta como "sin fecha", no como error.
function parsearFecha(crudo: string): { valor: Date | null; valido: boolean } {
  const texto = crudo.trim();
  if (!texto || texto === "0") return { valor: null, valido: true };

  const match = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return { valor: null, valido: false };

  const dia = Number(match[1]);
  const mes = Number(match[2]);
  let anio = Number(match[3]);
  if (anio < 100) anio += 2000;

  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const valido =
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;

  return valido ? { valor: fecha, valido: true } : { valor: null, valido: false };
}

function detectarDelimitador(lineas: string[]): string {
  if (lineas.some((l) => l.includes("\t"))) return "\t";
  if (lineas.some((l) => l.includes(";"))) return ";";
  return ",";
}

export function parseFichaImportText(texto: string): FichaImportResult {
  const lineas = texto
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lineas.length === 0) return { filas: [], errores: [] };

  const delimitador = detectarDelimitador(lineas);

  let columnas: CampoFicha[] = ORDEN_SIN_ENCABEZADO;
  let inicio = 0;

  const primeraCelda = lineas[0].split(delimitador)[0]?.trim();
  const esEncabezado = primeraCelda && ["FICHA", "CODIGO"].includes(claveEncabezado(primeraCelda));

  if (esEncabezado) {
    columnas = lineas[0]
      .split(delimitador)
      .map((celda) => MAPA_ENCABEZADOS[claveEncabezado(celda)] ?? "ignorar");
    inicio = 1;
  }

  const filas: ParsedFichaRow[] = [];
  const errores: FichaImportError[] = [];

  for (let i = inicio; i < lineas.length; i++) {
    const numeroLinea = i + 1;
    const celdas = lineas[i].split(delimitador).map((c) => c.trim());

    const valores: Partial<Record<CampoFicha, string>> = {};
    columnas.forEach((campo, idx) => {
      if (campo === "ignorar") return;
      if (!(campo in valores)) valores[campo] = celdas[idx] ?? "";
    });

    const codigo = (valores.codigo ?? "").trim();
    if (!codigo) {
      errores.push({ linea: numeroLinea, motivo: "Falta el código de ficha." });
      continue;
    }

    const programa = normalizarCatalogo(valores.programa ?? "", PROGRAMA_MAP);
    if (!programa.reconocido) {
      errores.push({
        linea: numeroLinea,
        motivo: `Programa de formación no reconocido: "${valores.programa}".`,
      });
      continue;
    }

    const estado = normalizarCatalogo(valores.estado ?? "", ESTADO_MAP);
    if (!estado.reconocido) {
      errores.push({ linea: numeroLinea, motivo: `Estado no reconocido: "${valores.estado}".` });
      continue;
    }

    const nivel = normalizarCatalogo(valores.nivelFormacion ?? "", NIVEL_MAP);
    if (!nivel.reconocido) {
      errores.push({
        linea: numeroLinea,
        motivo: `Nivel de formación no reconocido: "${valores.nivelFormacion}".`,
      });
      continue;
    }

    const jornada = normalizarCatalogo(valores.jornada ?? "", JORNADA_MAP);
    if (!jornada.reconocido) {
      errores.push({ linea: numeroLinea, motivo: `Jornada no reconocida: "${valores.jornada}".` });
      continue;
    }

    const fechaInicioFicha = parsearFecha(valores.fechaInicioFicha ?? "");
    const fechaFinFormacion = parsearFecha(valores.fechaFinFormacion ?? "");

    if (!fechaInicioFicha.valido || !fechaFinFormacion.valido) {
      errores.push({
        linea: numeroLinea,
        motivo: "Alguna fecha no tiene el formato D/M/AAAA esperado.",
      });
      continue;
    }

    const { fechaInicioProductiva, fechaLimiteIniciarEP } = calcularFechasFicha({
      nivelFormacion: nivel.valor,
      fechaInicioFicha: fechaInicioFicha.valor,
      fechaFinFormacion: fechaFinFormacion.valor,
    });

    filas.push({
      linea: numeroLinea,
      codigo,
      programa: programa.valor,
      estado: estado.valor,
      nivelFormacion: nivel.valor,
      jornada: jornada.valor,
      fechaInicioFicha: fechaInicioFicha.valor,
      fechaInicioProductiva,
      fechaFinFormacion: fechaFinFormacion.valor,
      fechaLimiteIniciarEP,
    });
  }

  return { filas, errores };
}

// Referencia de los valores reconocidos, usada solo para asegurarnos en tiempo de compilación
// de que ESTADO_MAP/NIVEL_MAP/JORNADA_MAP cubren todo el enum — si se agrega un valor nuevo al
// enum y se nos olvida mapearlo, TypeScript marca error acá.
type _AsegurarCoberturaEstado = (typeof EstadoFichaValues)[number];
type _AsegurarCoberturaNivel = (typeof NivelFormacionValues)[number];
type _AsegurarCoberturaJornada = (typeof JornadaValues)[number];
const _coberturaEstado: Record<_AsegurarCoberturaEstado, true> = {
  EN_EJECUCION: true,
  TERMINADA: true,
  TERMINADA_POR_FECHA: true,
};
const _coberturaNivel: Record<_AsegurarCoberturaNivel, true> = {
  TECNICO: true,
  TECNOLOGO: true,
  AUXILIAR: true,
};
const _coberturaJornada: Record<_AsegurarCoberturaJornada, true> = {
  MANANA: true,
  TARDE: true,
  NOCHE: true,
  MIXTA: true,
  VIRTUAL: true,
  TARDE_NOCHE: true,
};
void _coberturaEstado;
void _coberturaNivel;
void _coberturaJornada;
