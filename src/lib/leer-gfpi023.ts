// Lectura del formato GFPI-F-023 que el aprendiz adjunta, para no hacerle escribir a mano lo que
// ya está en el documento firmado (requisito del 28 sep 2026).
//
// El PDF se lee con `pdfjs-dist`: se saca todo el texto y se recorre **una sola vez** siguiendo el
// orden de las etiquetas de la plantilla oficial. Ese orden importa porque hay etiquetas repetidas
// —"Dirección:" y "Contacto telefónico:" salen tres veces, para el aprendiz, la empresa y el
// coformador—, así que cada valor es lo que hay entre su etiqueta y la siguiente.
//
// REGLAS:
// - Lo que no aparezca en el documento queda `null`. Nunca se deduce ni se completa un valor.
// - Lo leído es una **propuesta**: el aprendiz lo revisa en la vista previa antes de enviar, y lo
//   que él ya haya escrito manda sobre lo que diga el PDF.
// - Un PDF escaneado (una foto del papel) no tiene texto: ahí no se lee nada y se avisa.

import { paginasDelPdf, textoDePaginas } from "@/lib/leer-pdf";
import { leerRubrica, type ValoracionLeida } from "@/lib/leer-rubrica";

export type DatosDocumento = {
  regional: string | null;
  centroFormacion: string | null;
  nivelFormativo: string | null;
  programaFormacion: string | null;
  grupo: string | null;
  modalidadFormacion: string | null;
  estrategiaFormativa: string | null;
  fechaFinLectiva: string | null;
  aprendizNombre: string | null;
  tipoDocumento: string | null;
  identificacion: string | null;
  aprendizTelefono: string | null;
  aprendizDireccion: string | null;
  correoPersonal: string | null;
  correoInstitucional: string | null;
  alternativa: string | null;
  registroSofiaPlus: string | null;
  instructorNombre: string | null;
  instructorTelefono: string | null;
  instructorCorreo: string | null;
  empresaNombre: string | null;
  empresaDireccion: string | null;
  nitEmpresa: string | null;
  empresaCorreo: string | null;
  coformadorNombre: string | null;
  coformadorCargo: string | null;
  coformadorTelefono: string | null;
  asistenciaNombre: string | null;
  asistenciaTipo: string | null;
  asistenciaContacto: string | null;
  // Momento 1.
  fechaInicioEP: string | null;
  fechaFinEP: string | null;
  arlFechaAfiliacion: string | null;
  arlNumeroPoliza: string | null;
  horario: string | null;
  competenciasDesarrollar: string | null;
  resultadosAprendizaje: string | null;
  actividadesDesarrollar: string | null;
  evidenciasAprendizaje: string | null;
  observacionesAdicionales: string | null;
  // Momentos 2 y 3.
  fechaMomento: string | null;
  modalidadMomento: string | null;
  enlaceGrabacion: string | null;
  numeroVisitas: string | null;
  observacionesAprendiz: string | null;
};

// Etiquetas de la plantilla, EN EL ORDEN en que aparecen. El valor de cada una es el texto que va
// hasta la etiqueta siguiente. Las variantes cubren las diferencias de tildes y espacios que deja
// la conversión a PDF ("Sofia Plus" / "SofiaPlus", "co- formadora" / "coformadora").
const SECUENCIA: [keyof DatosDocumento | null, string[]][] = [
  ["regional", ["Regional:"]],
  ["centroFormacion", ["Centro de formación:", "Centro de formacion:"]],
  ["nivelFormativo", ["Nivel formativo:"]],
  ["programaFormacion", ["Programa de formación:", "Programa de formacion:"]],
  ["grupo", ["No. Grupo:", "N° Grupo:", "No Grupo:"]],
  ["modalidadFormacion", ["Modalidad de formación:", "Modalidad de formacion:"]],
  ["estrategiaFormativa", ["Estrategia formativa:"]],
  ["fechaFinLectiva", ["Fecha fin de la etapa lectiva:"]],
  [null, ["Datos del aprendiz"]],
  ["aprendizNombre", ["Nombre completo:"]],
  ["tipoDocumento", ["Tipo de documento:"]],
  ["identificacion", ["N° de identificación:", "N° de identificacion:", "No. de identificación:"]],
  ["aprendizTelefono", ["Contacto telefónico:", "Contacto telefonico:"]],
  ["aprendizDireccion", ["Dirección:", "Direccion:"]],
  ["correoPersonal", ["Correo electrónico personal:", "Correo electronico personal:"]],
  ["correoInstitucional", ["Correo electrónico institucional:", "Correo electronico institucional:"]],
  ["alternativa", ["Alternativa de etapa productiva registrada:"]],
  ["registroSofiaPlus", ["Fecha de Registro en Sofia Plus:", "Fecha de Registro en SofiaPlus:", "Fecha de registro en SofiaPlus:"]],
  [null, ["Datos del instructor de seguimiento:"]],
  ["instructorNombre", ["Nombre:"]],
  ["instructorTelefono", ["Contacto telefónico:", "Contacto telefonico:"]],
  ["instructorCorreo", ["Correo electrónico institucional:", "Correo electronico institucional:"]],
  ["empresaNombre", ["Nombre empresa o entidad co- formadora:", "Nombre empresa o entidad co-formadora:", "Nombre empresa o entidad coformadora:"]],
  ["empresaDireccion", ["Dirección:", "Direccion:"]],
  ["nitEmpresa", ["Nit:", "NIT:"]],
  ["empresaCorreo", ["Correo electrónico:", "Correo electronico:"]],
  ["coformadorNombre", ["Nombre del jefe inmediato/ co- formador del aprendiz/tutor:", "Nombre del jefe inmediato/ co-formador del aprendiz/tutor:", "Nombre del jefe inmediato/"]],
  ["coformadorCargo", ["Cargo:"]],
  ["coformadorTelefono", ["Contacto telefónico:", "Contacto telefonico:"]],
  [null, ["Nombre otro contacto:"]],
  [null, ["Teléfono institucional", "Telefono institucional"]],
  ["asistenciaNombre", ["Nombre de la persona que asiste al", "Nombre de la persona que asiste al aprendiz:"]],
  ["asistenciaTipo", ["Tipo de asistencia"]],
  ["asistenciaContacto", ["Contacto telefónico:", "Contacto telefonico:"]],
  [null, ["Con el diligenciamiento de este formato"]],
  // Momento 1.
  ["fechaInicioEP", ["Fecha inicio etapa productiva:"]],
  ["fechaFinEP", ["Fecha fin de etapa productiva:"]],
  ["arlFechaAfiliacion", ["Fecha de afiliación a la ARL:", "Fecha de afiliacion a la ARL:"]],
  ["arlNumeroPoliza", ["Número de póliza ARL:", "Numero de poliza ARL:"]],
  ["horario", ["Horario :", "Horario:"]],
  ["enlaceGrabacion", ["Enlace de grabación del momento 1:", "Enlace de grabación del momento", "Enlace de grabacion del momento"]],
  [null, ["Concertación plan de trabajo", "Concertacion plan de trabajo"]],
  ["competenciasDesarrollar", ["Competencias a desarrollar"]],
  ["resultadosAprendizaje", ["Resultados de aprendizaje"]],
  ["actividadesDesarrollar", ["Actividades para desarrollar", "Actividades a desarrollar"]],
  ["evidenciasAprendizaje", ["Evidencias de aprendizaje"]],
  ["observacionesAdicionales", ["Observaciones adicionales"]],
  [null, ["Firma del aprendiz"]],
];

// Momentos 2 y 3: se buscan aparte, porque están después de las firmas del Momento 1.
const SECUENCIA_SEGUIMIENTO: [keyof DatosDocumento | null, string[]][] = [
  ["fechaMomento", ["Fecha del momento de seguimiento:", "Fecha del momento de seguimiento :"]],
  ["modalidadMomento", ["Modalidad del seguimiento:"]],
  ["enlaceGrabacion", ["Enlace de grabación del momento 2:", "Enlace de grabacion del momento 2:"]],
  [null, ["Factores Técnicos", "Factores Tecnicos"]],
];

const SECUENCIA_CIERRE: [keyof DatosDocumento | null, string[]][] = [
  ["numeroVisitas", ["Número de visitas realizadas en toda la etapa productiva:", "Numero de visitas realizadas en toda la etapa productiva:"]],
  ["modalidadMomento", ["La evaluación se realizó en forma", "La evaluacion se realizo en forma"]],
  ["enlaceGrabacion", ["Enlace de grabación del momento 3:", "Enlace de grabacion del momento 3:"]],
  [null, ["Factores Técnicos", "Factores Tecnicos"]],
];

// La plantilla marca la opción elegida con una "x" al lado. "Presencial x Virtual A Distancia"
// significa Presencial; si no hay ninguna marca, no se elige nada.
function opcionMarcada(texto: string, opciones: string[]): string | null {
  for (const opcion of opciones) {
    const i = texto.toLowerCase().indexOf(opcion.toLowerCase());
    if (i === -1) continue;
    const despues = texto.slice(i + opcion.length, i + opcion.length + 4).trim().toLowerCase();
    if (despues.startsWith("x")) return opcion;
  }
  return null;
}

// Texto que trae la propia plantilla —instrucciones, notas al pie, encabezados de columna— y que
// al convertir a PDF queda mezclado con los valores. No es información del aprendiz: se borra.
const RELLENO_PLANTILLA: RegExp[] = [
  /\(?\s*DD\/MM\/AA\s*\)?/gi,
  /\{?\(?\s*S[i/]\s*aplica\s*\)?\}?/gi,
  /\(?\s*Indicar si es[^)]*\)?/gi,
  /\(?\s*Competencias del programa relacionad[oa]s?\s*\)?/gi,
  /\(?\s*Durante los meses de Etapa Productiva\s*\)?/gi,
  /\(?\s*Que generar[áa] el Aprendiz[^)]*\)?/gi,
  /\(?\s*En caso de ser necesarias\s*\)?/gi,
  /\(?\s*Aplica si se realiza de forma virtual\s*\)?/gi,
  /\(?\s*si se hace de forma virtual\s*\)?/gi,
  /\(?\s*presencial\/virtual\s*\)?/gi,
  /Datos del ente co-?\s*formador/gi,
  /\(?\s*jefe\s*Inmediato o tutor\*?\s*y empresa u organizaci[óo]n\s*\)?/gi,
  /\*?\s*Tutor:?\s*resoluci[óo]n/gi,
  /resoluci[óo]n\s*0623 del 2020 y 3546 del\s*2018\.?/gi,
  /0623 del 2020 y 3546 del\s*2018\.?/gi,
  /Persona en\s*situaci[óo]n de\s*discapacidad\s*\(?\s*Si aplica\)?/gi,
  /\(?\s*lenguaje de se[ñn]as, apoyo visual, u otros\s*\)?/gi,
  /Describa las evidencias[\s\S]*?f[íi]sica\./gi,
  /Registre los comentarios[\s\S]*?correspondiente\./gi,
  /GFPI-F-0?[Z2]3\s*V?\.?\s*6?\.?/gi,
  /Datos del\s*(aprendiz|instructor de seguimiento)?:?\s*$/gi,
  /Nombre y\s*$/gi,
  /ente co-?\s*/gi,
  /\bformador\b\s*(Direcci[óo]n:)?/gi,
  /Inmediato o tutor\*?\s*y empresa u organizaci[óo]n\)?/gi,
  /[_]{3,}/g,
  /\(\s*\)/g,
];

function limpiarValor(valor: string): string | null {
  let v = valor;
  for (const patron of RELLENO_PLANTILLA) v = v.replace(patron, " ");
  v = v.replace(/\s+/g, " ").replace(/^[\s:;.,\-]+|[\s:;.,\-]+$/g, "").trim();
  // Lo que queda demasiado corto o demasiado largo no es un valor: es ruido de la tabla.
  return v.length >= 2 && v.length < 2000 ? v : null;
}

// Cada campo se valida según lo que debe ser. Si lo leído no tiene esa forma, se descarta: vale
// más un campo vacío que uno con un pedazo de la plantilla adentro.
const CORREO = /[^\s@]+@[^\s@]+\.[^\s@]{2,}/;
const FECHA = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/;

function primerCorreo(v: string): string | null {
  return v.match(CORREO)?.[0] ?? null;
}
function primeraFecha(v: string): string | null {
  return v.match(FECHA)?.[0] ?? null;
}
function soloDigitos(v: string, minimo: number): string | null {
  const m = v.match(new RegExp(`\\b\\d[\\d.\\-]{${minimo - 1},}`));
  return m ? m[0].replace(/[.\-]$/, "") : null;
}
function deLista(v: string, opciones: string[]): string | null {
  const texto = v.toLowerCase();
  return opciones.find((o) => texto.includes(o.toLowerCase())) ?? null;
}

const VALIDADORES: Partial<Record<keyof DatosDocumento, (v: string) => string | null>> = {
  correoPersonal: primerCorreo,
  correoInstitucional: primerCorreo,
  instructorCorreo: primerCorreo,
  empresaCorreo: primerCorreo,
  fechaFinLectiva: primeraFecha,
  registroSofiaPlus: primeraFecha,
  fechaInicioEP: primeraFecha,
  fechaFinEP: primeraFecha,
  arlFechaAfiliacion: primeraFecha,
  fechaMomento: primeraFecha,
  identificacion: (v) => soloDigitos(v, 6),
  grupo: (v) => soloDigitos(v, 5),
  nitEmpresa: (v) => soloDigitos(v, 7),
  aprendizTelefono: (v) => soloDigitos(v, 7),
  instructorTelefono: (v) => soloDigitos(v, 7),
  coformadorTelefono: (v) => soloDigitos(v, 7),
  asistenciaContacto: (v) => soloDigitos(v, 7),
  numeroVisitas: (v) => v.match(/\b\d{1,2}\b/)?.[0] ?? null,
  nivelFormativo: (v) => deLista(v, ["Técnico", "Tecnólogo", "Auxiliar", "Especialización"]),
  tipoDocumento: (v) =>
    deLista(v, ["Cédula de ciudadanía", "Tarjeta de identidad", "Cédula de extranjería", "Cédula", "NUIP", "PEP"]),
  modalidadFormacion: (v) => deLista(v, ["Presencial", "Virtual", "A Distancia"]),
  modalidadMomento: (v) => deLista(v, ["Presencial", "Virtual"]),
  arlNumeroPoliza: (v) => (/[0-9]/.test(v) ? v : null),
  enlaceGrabacion: (v) => v.match(/https?:\/\/\S+/)?.[0] ?? null,
};

// Solo se aprovecha lo que SEPA no sabe por otro lado. Los datos de la empresa y del coformador
// quedan fuera a propósito: el sistema ya los tiene del perfil del aprendiz, y en el PDF salen
// mezclados con el texto de la tabla, así que leerlos ahí sería empeorarlos.
export const CAMPOS_APROVECHABLES = [
  "regional",
  "centroFormacion",
  "estrategiaFormativa",
  "modalidadFormacion",
  "tipoDocumento",
  "correoInstitucional",
  "registroSofiaPlus",
  "nitEmpresa",
  "arlFechaAfiliacion",
  "arlNumeroPoliza",
  "horario",
  "competenciasDesarrollar",
  "resultadosAprendizaje",
  "actividadesDesarrollar",
  "evidenciasAprendizaje",
  "observacionesAdicionales",
  "enlaceGrabacion",
  "fechaMomento",
  "modalidadMomento",
  "numeroVisitas",
] as const satisfies readonly (keyof DatosDocumento)[];

export type CampoAprovechable = (typeof CAMPOS_APROVECHABLES)[number];

// Recorre el texto una vez siguiendo la secuencia de etiquetas y devuelve lo que hay entre cada
// una y la siguiente.
function recorrer(
  texto: string,
  secuencia: [keyof DatosDocumento | null, string[]][],
  desde = 0,
): Partial<DatosDocumento> {
  const encontrado: Partial<DatosDocumento> = {};
  let cursor = desde;

  const posicion = (etiquetas: string[], inicio: number) => {
    let mejor = -1;
    let usada = "";
    for (const etiqueta of etiquetas) {
      const i = texto.indexOf(etiqueta, inicio);
      if (i !== -1 && (mejor === -1 || i < mejor)) {
        mejor = i;
        usada = etiqueta;
      }
    }
    return { indice: mejor, etiqueta: usada };
  };

  for (let paso = 0; paso < secuencia.length; paso++) {
    const [clave, etiquetas] = secuencia[paso];
    const actual = posicion(etiquetas, cursor);
    if (actual.indice === -1) continue;

    const inicioValor = actual.indice + actual.etiqueta.length;
    // El valor termina en la más cercana de las etiquetas que vienen después.
    let fin = texto.length;
    for (let siguiente = paso + 1; siguiente < secuencia.length; siguiente++) {
      const proxima = posicion(secuencia[siguiente][1], inicioValor);
      if (proxima.indice !== -1 && proxima.indice < fin) fin = proxima.indice;
    }

    if (clave) {
      const limpio = limpiarValor(texto.slice(inicioValor, fin));
      const validador = VALIDADORES[clave];
      const valor = limpio && validador ? validador(limpio) : limpio;
      if (valor) encontrado[clave] = valor;
    }
    cursor = inicioValor;
  }

  return encontrado;
}

export type LecturaDocumento = {
  datos: Partial<DatosDocumento>;
  // Cuántos campos se pudieron leer, para avisarle al aprendiz si el PDF no traía texto.
  leidos: number;
  // El PDF no tenía texto (probablemente es una foto o un escaneo).
  sinTexto: boolean;
  // Momentos 2 y 3: las 13 variables marcadas con «X» en el formato (9 oct 2026). Vacío si el
  // momento no está diligenciado en el PDF.
  rubrica?: ValoracionLeida[];
  // Momentos 2 y 3: el PDF trae diligenciado otro momento y no este (9 oct 2026: un aprendiz subió
  // su Momento 2 en el espacio del Momento 3). Con esto SEPA no lo acepta en ese espacio.
  otroMomento?: 2 | 3;
};

const NOMBRE_MOMENTO: Record<2 | 3, string> = { 2: "Momento 2 (Seguimiento)", 3: "Momento 3 (Cierre)" };

export function mensajeOtroMomento(adjuntado: 2 | 3, diligenciado: 2 | 3): string {
  return `El PDF que adjuntaste trae diligenciado el ${NOMBRE_MOMENTO[diligenciado]}, no el ${NOMBRE_MOMENTO[adjuntado]}. Adjunta aquí el formato de este momento; ese PDF va en el ${NOMBRE_MOMENTO[diligenciado]}.`;
}

export async function leerFormato(
  archivo: ArrayBuffer,
  momento: 1 | 2 | 3,
): Promise<LecturaDocumento> {
  const paginas = await paginasDelPdf(archivo);
  const texto = textoDePaginas(paginas);
  if (texto.replace(/\s/g, "").length < 200) {
    return { datos: {}, leidos: 0, sinTexto: true };
  }

  const datos: Partial<DatosDocumento> = recorrer(texto, SECUENCIA);

  if (momento !== 1) {
    const secuencia = momento === 2 ? SECUENCIA_SEGUIMIENTO : SECUENCIA_CIERRE;
    Object.assign(datos, recorrer(texto, secuencia));
  }

  // Las casillas de opción se marcan con una x, no se escriben.
  const modalidadFormacion = opcionMarcada(texto, ["Presencial", "Virtual", "A Distancia"]);
  if (modalidadFormacion) datos.modalidadFormacion = modalidadFormacion;

  // Se devuelve solo lo aprovechable: lo demás vendría con ruido de la plantilla.
  const utiles: Partial<DatosDocumento> = {};
  for (const campo of CAMPOS_APROVECHABLES) {
    if (datos[campo]) utiles[campo] = datos[campo];
  }

  const rubrica = momento === 1 ? [] : leerRubrica(paginas, momento).filter((v) => v.valoracion);
  // Un PDF con los dos momentos diligenciados (el formato acumulado) se acepta en cualquiera de
  // los dos; uno que solo trae el otro, no.
  const otro = momento === 2 ? 3 : momento === 3 ? 2 : null;
  const otroMomento =
    otro && rubrica.length === 0 && leerRubrica(paginas, otro).some((v) => v.valoracion) ? otro : undefined;

  return {
    datos: utiles,
    leidos: Object.keys(utiles).length,
    sinTexto: false,
    ...(rubrica.length ? { rubrica } : {}),
    ...(otroMomento ? { otroMomento } : {}),
  };
}
