import {
  AlternativaEtapaProductivaValues,
  type AlternativaEtapaProductivaValue,
} from "@/lib/validations";

// Importador de aprendices desde una hoja de cálculo (pegar texto separado por tabulaciones, con
// o sin fila de encabezado — mismo mecanismo que src/lib/ficha-import.ts e instructor-import.ts).
// Columnas de la hoja real: documento, nombres, apellidos, teléfono, correo, ficha, programa de
// formación, instructor, alternativa EP. "Programa" e "instructor" se ignoran a propósito: ya
// viven en la ficha (Ficha.programa / Ficha.instructorId), no se duplican por aprendiz.

export type ParsedAprendizRow = {
  linea: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  celular: string;
  email: string;
  fichaCodigo: string;
  alternativaEtapaProductiva: AlternativaEtapaProductivaValue;
};

export type AprendizImportError = { linea: number; motivo: string };

export type AprendizImportResult = {
  filas: ParsedAprendizRow[];
  errores: AprendizImportError[];
};

function quitarAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function claveEncabezado(texto: string): string {
  return quitarAcentos(texto).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

type CampoAprendiz =
  | "cedula"
  | "nombres"
  | "apellidos"
  | "celular"
  | "email"
  | "fichaCodigo"
  | "alternativa"
  | "ignorar";

const MAPA_ENCABEZADOS: Record<string, CampoAprendiz> = {
  DOCUMENTODELAPRENDIZ: "cedula",
  DOCUMENTO: "cedula",
  CEDULA: "cedula",
  NOMBRESDELAPRENDIZ: "nombres",
  NOMBRES: "nombres",
  NOMBRE: "nombres",
  APELLIDOSDELAPRENDIZ: "apellidos",
  APELLIDOS: "apellidos",
  APELLIDO: "apellidos",
  TELEFONODELAPRENDIZ: "celular",
  TELEFONO: "celular",
  CELULAR: "celular",
  CORREOELECTRONICO: "email",
  CORREO: "email",
  EMAIL: "email",
  FICHA: "fichaCodigo",
  PROGRAMASDEFORMACION: "ignorar",
  PROGRAMADEFORMACION: "ignorar",
  INSTRUCTOR: "ignorar",
  ALTERNATIVAEP: "alternativa",
  ALTERNATIVA: "alternativa",
  ALTERNATIVADEETAPAPRODUCTIVA: "alternativa",
};

const ORDEN_SIN_ENCABEZADO: CampoAprendiz[] = [
  "cedula",
  "nombres",
  "apellidos",
  "celular",
  "email",
  "fichaCodigo",
  "ignorar", // programa de formación
  "ignorar", // instructor
  "alternativa",
];

const ALTERNATIVA_MAP: Record<string, AlternativaEtapaProductivaValue> = Object.fromEntries(
  AlternativaEtapaProductivaValues.map((v) => [claveEncabezado(v), v]),
);
// Alias con nombre legible (el que se pega desde una hoja suele traer el label, no el enum).
const ALTERNATIVA_LABELS: Record<AlternativaEtapaProductivaValue, string> = {
  CONTRATO_APRENDIZAJE: "Contrato de aprendizaje",
  CONTRATO_VINCULO_FORMATIVO: "Contrato vínculo formativo",
  MONITORIA: "Monitoría",
  PROYECTO_PRODUCTIVO: "Proyecto productivo",
  VINCULO_LABORAL: "Vínculo laboral",
};
for (const [valor, label] of Object.entries(ALTERNATIVA_LABELS)) {
  ALTERNATIVA_MAP[claveEncabezado(label)] = valor as AlternativaEtapaProductivaValue;
}

function detectarDelimitador(lineas: string[]): string {
  if (lineas.some((l) => l.includes("\t"))) return "\t";
  if (lineas.some((l) => l.includes(";"))) return ";";
  return ",";
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseAprendizImportText(texto: string): AprendizImportResult {
  const lineas = texto
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lineas.length === 0) return { filas: [], errores: [] };

  const delimitador = detectarDelimitador(lineas);

  let columnas: CampoAprendiz[] = ORDEN_SIN_ENCABEZADO;
  let inicio = 0;

  const primeraCelda = lineas[0].split(delimitador)[0]?.trim();
  const esEncabezado =
    primeraCelda && claveEncabezado(primeraCelda).startsWith("DOCUMENTO");

  if (esEncabezado) {
    columnas = lineas[0]
      .split(delimitador)
      .map((celda) => MAPA_ENCABEZADOS[claveEncabezado(celda)] ?? "ignorar");
    inicio = 1;
  }

  const filas: ParsedAprendizRow[] = [];
  const errores: AprendizImportError[] = [];

  for (let i = inicio; i < lineas.length; i++) {
    const numeroLinea = i + 1;
    const celdas = lineas[i].split(delimitador).map((c) => c.trim());

    const valores: Partial<Record<CampoAprendiz, string>> = {};
    columnas.forEach((campo, idx) => {
      if (campo === "ignorar") return;
      if (!(campo in valores)) valores[campo] = celdas[idx] ?? "";
    });

    const cedula = (valores.cedula ?? "").trim();
    const nombres = (valores.nombres ?? "").trim();
    const apellidos = (valores.apellidos ?? "").trim();
    const celular = (valores.celular ?? "").trim();
    const email = (valores.email ?? "").trim();
    const fichaCodigo = (valores.fichaCodigo ?? "").trim();

    if (!cedula || !nombres || !apellidos || !celular || !email || !fichaCodigo) {
      errores.push({
        linea: numeroLinea,
        motivo: "Faltan datos obligatorios (documento, nombres, apellidos, teléfono, correo o ficha).",
      });
      continue;
    }

    if (!EMAIL_REGEX.test(email)) {
      errores.push({ linea: numeroLinea, motivo: `Correo no válido: "${email}".` });
      continue;
    }

    const alternativaTexto = (valores.alternativa ?? "").trim();
    const alternativa = alternativaTexto ? ALTERNATIVA_MAP[claveEncabezado(alternativaTexto)] : undefined;
    if (!alternativa) {
      errores.push({
        linea: numeroLinea,
        motivo: `Alternativa de Etapa Productiva no reconocida: "${alternativaTexto}".`,
      });
      continue;
    }

    filas.push({
      linea: numeroLinea,
      cedula,
      nombres,
      apellidos,
      celular,
      email,
      fichaCodigo,
      alternativaEtapaProductiva: alternativa,
    });
  }

  return { filas, errores };
}
