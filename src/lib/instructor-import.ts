import { CoordinacionValues, type CoordinacionValue } from "@/lib/validations";
import { departamentoOficial, municipioOficial } from "@/lib/colombia";

// Importador de instructores desde una hoja de cálculo (pegar texto separado por tabulaciones,
// con o sin fila de encabezado — mismo mecanismo que src/lib/ficha-import.ts). Columnas: nombres,
// apellidos, cédula, correo, celular, dirección de residencia, departamento, municipio, coordinación.
// Departamento y municipio se aceptan como los escriba la gente («antioquia», «medellin») y se
// guardan con el nombre oficial del DANE (25 nov 2026; reemplazan la comuna).

export type ParsedInstructorRow = {
  linea: number;
  nombres: string;
  apellidos: string;
  cedula: string;
  email: string;
  celular: string;
  direccionResidencia: string;
  departamento: string | null;
  ciudad: string | null;
  coordinacion: CoordinacionValue | null;
};

export type InstructorImportError = { linea: number; motivo: string };

export type InstructorImportResult = {
  filas: ParsedInstructorRow[];
  errores: InstructorImportError[];
};

function quitarAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function claveEncabezado(texto: string): string {
  return quitarAcentos(texto).toUpperCase().replace(/[^A-Z0-9]/g, "");
}

type CampoInstructor =
  | "nombres"
  | "apellidos"
  | "cedula"
  | "email"
  | "celular"
  | "direccionResidencia"
  | "departamento"
  | "ciudad"
  | "coordinacion"
  | "ignorar";

const MAPA_ENCABEZADOS: Record<string, CampoInstructor> = {
  NOMBRES: "nombres",
  NOMBRE: "nombres",
  APELLIDOS: "apellidos",
  APELLIDO: "apellidos",
  CEDULA: "cedula",
  CORREO: "email",
  CORREOELECTRONICO: "email",
  EMAIL: "email",
  CELULAR: "celular",
  TELEFONO: "celular",
  DIRECCION: "direccionResidencia",
  DIRECCIONDERESIDENCIA: "direccionResidencia",
  DEPARTAMENTO: "departamento",
  MUNICIPIO: "ciudad",
  CIUDAD: "ciudad",
  COORDINACION: "coordinacion",
};

const ORDEN_SIN_ENCABEZADO: CampoInstructor[] = [
  "nombres",
  "apellidos",
  "cedula",
  "email",
  "celular",
  "direccionResidencia",
  "departamento",
  "ciudad",
  "coordinacion",
];

const COORDINACION_MAP: Record<string, CoordinacionValue> = Object.fromEntries(
  CoordinacionValues.map((v) => [claveEncabezado(v), v])
);
// Alias de coordinación con nombre legible (el que se pega desde una hoja suele traer el label,
// no el nombre del enum de Prisma).
COORDINACION_MAP[claveEncabezado("Contabilidad y Finanzas")] = "CONTABILIDAD_FINANZAS";
COORDINACION_MAP[claveEncabezado("Comercio y Ventas")] = "COMERCIO_VENTAS";
COORDINACION_MAP[claveEncabezado("Gestión Administrativa y Documental")] =
  "GESTION_ADMINISTRATIVA_DOCUMENTAL";
COORDINACION_MAP[claveEncabezado("Gestion Administrativa y Documental")] =
  "GESTION_ADMINISTRATIVA_DOCUMENTAL";


function normalizarCatalogo<T extends string>(
  crudo: string,
  mapa: Record<string, T>
): { valor: T | null; reconocido: boolean } {
  const texto = crudo.trim();
  if (!texto) return { valor: null, reconocido: true };
  const clave = claveEncabezado(texto);
  const valor = mapa[clave];
  return valor ? { valor, reconocido: true } : { valor: null, reconocido: false };
}

function detectarDelimitador(lineas: string[]): string {
  if (lineas.some((l) => l.includes("\t"))) return "\t";
  if (lineas.some((l) => l.includes(";"))) return ";";
  return ",";
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseInstructorImportText(texto: string): InstructorImportResult {
  const lineas = texto
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lineas.length === 0) return { filas: [], errores: [] };

  const delimitador = detectarDelimitador(lineas);

  let columnas: CampoInstructor[] = ORDEN_SIN_ENCABEZADO;
  let inicio = 0;

  const primeraCelda = lineas[0].split(delimitador)[0]?.trim();
  const esEncabezado =
    primeraCelda && ["NOMBRES", "NOMBRE"].includes(claveEncabezado(primeraCelda));

  if (esEncabezado) {
    columnas = lineas[0]
      .split(delimitador)
      .map((celda) => MAPA_ENCABEZADOS[claveEncabezado(celda)] ?? "ignorar");
    inicio = 1;
  }

  const filas: ParsedInstructorRow[] = [];
  const errores: InstructorImportError[] = [];

  for (let i = inicio; i < lineas.length; i++) {
    const numeroLinea = i + 1;
    const celdas = lineas[i].split(delimitador).map((c) => c.trim());

    const valores: Partial<Record<CampoInstructor, string>> = {};
    columnas.forEach((campo, idx) => {
      if (campo === "ignorar") return;
      if (!(campo in valores)) valores[campo] = celdas[idx] ?? "";
    });

    const nombres = (valores.nombres ?? "").trim();
    const apellidos = (valores.apellidos ?? "").trim();
    const cedula = (valores.cedula ?? "").trim();
    const email = (valores.email ?? "").trim();
    const celular = (valores.celular ?? "").trim();
    const direccionResidencia = (valores.direccionResidencia ?? "").trim();

    if (!nombres || !apellidos || !cedula || !email || !celular || !direccionResidencia) {
      errores.push({
        linea: numeroLinea,
        motivo: "Faltan datos obligatorios (nombres, apellidos, cédula, correo, celular o dirección).",
      });
      continue;
    }

    if (!EMAIL_REGEX.test(email)) {
      errores.push({ linea: numeroLinea, motivo: `Correo no válido: "${email}".` });
      continue;
    }

    // Departamento y municipio: opcionales en la hoja, pero si vienen deben ser del DANE.
    const departamento = valores.departamento?.trim() ? departamentoOficial(valores.departamento) : null;
    if (valores.departamento?.trim() && !departamento) {
      errores.push({ linea: numeroLinea, motivo: `Departamento no reconocido: "${valores.departamento}".` });
      continue;
    }
    const ciudad = valores.ciudad?.trim() ? (departamento ? municipioOficial(departamento, valores.ciudad) : null) : null;
    if (valores.ciudad?.trim() && !ciudad) {
      errores.push({
        linea: numeroLinea,
        motivo: departamento
          ? `Municipio no reconocido en ${departamento}: "${valores.ciudad}".`
          : `Para el municipio "${valores.ciudad}" falta el departamento.`,
      });
      continue;
    }

    const coordinacion = normalizarCatalogo(valores.coordinacion ?? "", COORDINACION_MAP);
    if (!coordinacion.reconocido) {
      errores.push({
        linea: numeroLinea,
        motivo: `Coordinación no reconocida: "${valores.coordinacion}".`,
      });
      continue;
    }

    filas.push({
      linea: numeroLinea,
      nombres,
      apellidos,
      cedula,
      email,
      celular,
      direccionResidencia,
      departamento,
      ciudad,
      coordinacion: coordinacion.valor,
    });
  }

  return { filas, errores };
}
