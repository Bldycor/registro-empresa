import { limpiarConPatrones, textoDelPdf } from "@/lib/leer-pdf";

// Lectura de la bitácora GFPI-F-147 que el aprendiz adjunta, para no hacerle escribir a mano lo
// que ya está en el documento (requisito del 29 sep 2026).
//
// Ojo con la forma del archivo: la bitácora es una hoja de cálculo, y al exportarla a PDF las
// etiquetas salen en bloque y los valores después, no intercalados como en el GFPI-F-023. Por eso
// aquí no se puede recorrer «etiqueta → valor»: se acota la zona de cada sección y se reconoce
// cada dato por su forma (una fecha parece una fecha, un correo parece un correo) o por lo que
// queda al quitar el texto fijo de la plantilla.
//
// REGLAS, las mismas del otro lector:
// - Lo que no aparezca queda `null`; nunca se deduce ni se inventa.
// - Lo leído es una propuesta: el aprendiz lo revisa y corrige antes de enviar.
// - Un PDF escaneado no tiene texto y no se puede leer.

export type DatosBitacora = {
  numero: string | null;
  periodoDesde: string | null;
  periodoHasta: string | null;
  correoInstitucional: string | null;
  modalidadEjecucion: string | null;
  arlAfiliado: boolean | null;
  arlNivelRiesgo: string | null;
  arlRiesgoCorresponde: boolean | null;
  arlTieneEPP: boolean | null;
  // La tabla «Descripción de las actividades realizadas».
  descripcion: string | null;
  competencias: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  evidenciaCumplimiento: string | null;
  observaciones: string | null;
};

export type LecturaBitacora = {
  datos: Partial<DatosBitacora>;
  leidos: number;
  sinTexto: boolean;
};

// Texto fijo de la plantilla dentro de la zona de actividades: son títulos de columna y
// aclaraciones, no lo que escribió el aprendiz.
const RELLENO_ACTIVIDADES = [
  /Descripci[óo]n de las actividades realizad[ao]s?/gi,
  /Descripci[óo]n de la actividad\s*\(?\s*Ingrese cuantas filas sean necesarias\s*\)?/gi,
  /Observaciones, inasistencias, dificultades presentadas,? y\/o comentarios realizados por el aprendiz y\/o jefe inmediato/gi,
  /Competencias del programa de formaci[óo]n aplicadas en el desarrollo de la actividad/gi,
  /Evidencia de cumplimiento\s*\(?\s*Indique si corresponde a un documento, proceso, producto, entregable u otro\s*\)?/gi,
  /En anexo puede fortalecer la evidencia si es el caso\.?/gi,
  /Fecha de inicio\s*\(?dd\/mm\/aa\)?/gi,
  /Fecha de fin\s*\(?dd\/mm\/aa\)?/gi,
  /Datos del instructor de seguimiento/gi,
  /Nombre completo del instructor de seguimiento/gi,
  /Correo electr[óo]nico del instructor de seguimiento/gi,
  /Seleccione con una "?X"? la alternativa de etapa productiva que est[áa] realizando/gi,
  /Marque[n]? con una X/gi,
  /Contrato de aprendizaje|Contrato de v[íi]nculo formativo|V[íi]nculo laboral|Proyecto productivo|Monitoria/gi,
  /\bx\b/gi,
];

// Zona de un documento entre dos marcas. Si no están, no se inventa nada.
function zona(texto: string, desde: RegExp, hasta: RegExp): string | null {
  const inicio = texto.search(desde);
  if (inicio === -1) return null;
  const resto = texto.slice(inicio);
  const fin = resto.slice(1).search(hasta);
  return fin === -1 ? resto : resto.slice(0, fin + 1);
}

function siNo(texto: string | null): boolean | null {
  if (!texto) return null;
  const t = texto.trim().toLowerCase();
  if (/^s[ií]\b/.test(t)) return true;
  if (/^no\b/.test(t)) return false;
  return null;
}

export async function leerBitacora(archivo: ArrayBuffer): Promise<LecturaBitacora> {
  const texto = await textoDelPdf(archivo);
  if (texto.replace(/\s/g, "").length < 200) {
    return { datos: {}, leidos: 0, sinTexto: true };
  }
  const t = texto.replace(/\s+/g, " ");

  const datos: Partial<DatosBitacora> = {};

  // La hoja diligenciada empieza en «Bitácora N° X»; antes va el instructivo, que no interesa.
  const hoja = t.slice(Math.max(0, t.lastIndexOf("Bitácora N°")));

  const numero = hoja.match(/Bitácora N°\s*(\d{1,2})/)?.[1];
  if (numero) datos.numero = numero;

  // «Período a reportar Desde10/7/2026 hasta 25/7/2026» — el export pega el "Desde" al valor.
  // El export pega el "Desde" al valor y a veces se come un separador («Desde26/72026»), así que
  // cada extremo se busca por separado: si uno viene partido se deja vacío y el otro se aprovecha.
  const periodo = hoja.match(/Per[íi]odo a reportar\s*Desde(.{0,24}?)\s*hasta(.{0,24}?)(?:Datos|Nombre|$)/i);
  if (periodo) {
    const fecha = (trozo: string) => trozo.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)?.[0] ?? null;
    datos.periodoDesde = fecha(periodo[1]);
    datos.periodoHasta = fecha(periodo[2]);
  }

  const correo = hoja.match(/[A-Za-z0-9._%+-]+@(?:soy\.)?sena\.edu\.co/)?.[0];
  if (correo) datos.correoInstitucional = correo;

  const modalidad = hoja.match(
    /Modalidad de ejecuci[óo]n de la etapa productiva\s*\(?\s*presencial o virtual\s*\)?\s*([A-Za-zíé]+)/i,
  )?.[1];
  if (modalidad && /^(presencial|virtual)$/i.test(modalidad)) {
    datos.modalidadEjecucion = modalidad.toLowerCase() === "virtual" ? "VIRTUAL" : "PRESENCIAL";
  }

  // ARL: las respuestas van sueltas después de sus preguntas.
  const zonaArl = zona(hoja, /Informaci[óo]n afiliaci[óo]n a la ARL/i, /Firma del aprendiz|Anexo:/i);
  if (zonaArl) {
    const afiliado = zonaArl.match(/¿El aprendiz se encuentra afiliado a la ARL\?\s*(s[ií]|no)/i)?.[1];
    datos.arlAfiliado = siNo(afiliado ?? null);
    const nivel = zonaArl.match(/\bnivel\s*(?:de riesgo)?\s*(I{1,3}V?|IV|V|[1-5])\b/i)?.[1];
    if (nivel) {
      const romanos: Record<string, string> = { "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V" };
      datos.arlNivelRiesgo = (romanos[nivel] ?? nivel.toUpperCase());
    }
    const corresponde = zonaArl.match(/corresponde a las actividades[^?]*\?\s*(s[ií]|no)/i)?.[1];
    datos.arlRiesgoCorresponde = siNo(corresponde ?? null);
    const epp = zonaArl.match(/elementos de protecci[óo]n personal[^?]*\?\s*(s[ií]|no)/i)?.[1];
    datos.arlTieneEPP = siNo(epp ?? null);
  }

  // Zona de actividades: de su título hasta la sección de ARL.
  const zonaActividades = zona(
    hoja,
    /Descripci[óo]n de las actividades realizad/i,
    /Informaci[óo]n afiliaci[óo]n a la ARL/i,
  );
  if (zonaActividades) {
    const fechas = zonaActividades.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g) ?? [];
    if (fechas[0]) datos.fechaInicio = fechas[0];
    if (fechas[1]) datos.fechaFin = fechas[1];

    // Lo que queda al quitar el texto fijo, las fechas y los datos del instructor es lo que
    // escribió el aprendiz. No se puede saber qué parte es de cada columna —la hoja de cálculo
    // no conserva ese orden al exportarse—, así que va completo a la descripción para que él lo
    // reparta. Es más honesto que repartirlo adivinando.
    let libre = limpiarConPatrones(zonaActividades, RELLENO_ACTIVIDADES)
      .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, " ")
      .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // El nombre del instructor queda suelto en esa zona; no es una actividad.
    libre = libre.replace(/\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){2,}\b/g, " ").replace(/\s+/g, " ").trim();

    if (libre.length >= 3) datos.descripcion = libre;
  }

  const leidos = Object.values(datos).filter((v) => v !== null && v !== undefined).length;
  return { datos, leidos, sinTexto: false };
}

