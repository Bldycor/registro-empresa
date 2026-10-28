import {
  limpiarConPatrones,
  paginasDelPdf,
  renglones,
  textoDePaginas,
  textoEnOrdenDeLectura,
  unirTextos,
  type TextoPosicionado,
} from "@/lib/leer-pdf";

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
  const paginas = await paginasDelPdf(archivo);
  const texto = textoDePaginas(paginas);
  if (texto.replace(/\s/g, "").length < 200) {
    return { datos: {}, leidos: 0, sinTexto: true };
  }

  const datos = leerEnOrdenDelArchivo(texto);

  // Excel para Mac guarda los textos en otro orden (28 oct 2026): el período, la ARL y las
  // actividades no quedan junto a sus etiquetas. Ahí se lee la hoja por posición: lo que falte se
  // completa con eso, y la primera actividad, si se reconoce su tabla, sale columna por columna.
  const porPosicion = leerPorPosicion(paginas);
  for (const clave of Object.keys(porPosicion) as (keyof DatosBitacora)[]) {
    if (datos[clave] === null || datos[clave] === undefined) Object.assign(datos, { [clave]: porPosicion[clave] });
  }
  const actividad = primeraActividad(paginas);
  if (actividad) Object.assign(datos, actividad);

  const leidos = Object.values(datos).filter((v) => v !== null && v !== undefined).length;
  return { datos, leidos, sinTexto: false };
}

function leerEnOrdenDelArchivo(texto: string): Partial<DatosBitacora> {
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

  return datos;
}

const FECHA = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;

// Número, período y ARL según dónde está cada texto en la hoja.
function leerPorPosicion(paginas: TextoPosicionado[][]): Partial<DatosBitacora> {
  const datos: Partial<DatosBitacora> = {};
  const t = textoEnOrdenDeLectura(paginas).replace(/\s+/g, " ");
  const hoja = t.slice(Math.max(0, t.lastIndexOf("Bitácora N°")));

  // «Bitácora N° Período a reportar 1 Desde 06/04/2026 hasta 06/05/2026»: las etiquetas en un
  // renglón y los valores en el de abajo.
  const numero = hoja.match(/Bitácora N°\s*(?:Per[íi]odo a reportar\s*)?(\d{1,2})\b/)?.[1];
  if (numero) datos.numero = numero;
  const periodo = hoja.match(/Desde\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*hasta\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  if (periodo) {
    datos.periodoDesde = periodo[1];
    datos.periodoHasta = periodo[2];
  }

  // ARL: la respuesta de cada pregunta va en la celda de abajo o en la de la derecha. Se toma la
  // respuesta más cercana en esas dos direcciones.
  const items = paginas.flat();
  const respuesta = (pregunta: RegExp, forma: RegExp): string | null => {
    const p = items.find((i) => pregunta.test(i.s));
    if (!p) return null;
    const candidatas = items.filter((i) => {
      if (!forma.test(i.s.trim())) return false;
      const derecha = i.x >= p.x + p.w - 2 && Math.abs(i.y - p.y) <= 15;
      const debajo = i.y < p.y && p.y - i.y <= 30 && i.x >= p.x - 5 && i.x <= p.x + p.w + 5;
      return derecha || debajo;
    });
    const distancia = (i: TextoPosicionado) => Math.hypot(i.x - p.x, i.y - p.y);
    return candidatas.sort((a, b) => distancia(a) - distancia(b))[0]?.s.trim() ?? null;
  };
  const SI_NO = /^(s[ií]|no|n\/?a)$/i;
  datos.arlAfiliado = siNo(respuesta(/se encuentra afiliado/i, SI_NO));
  datos.arlRiesgoCorresponde = siNo(respuesta(/riesgo de la ARL corresponde/i, SI_NO));
  datos.arlTieneEPP = siNo(respuesta(/cuenta con los elementos de/i, SI_NO));
  const nivel = respuesta(/nivel de riesgo actual/i, /^(I{1,3}|IV|V|[1-5])$/i);
  if (nivel) {
    const romanos: Record<string, string> = { "1": "I", "2": "II", "3": "III", "4": "IV", "5": "V" };
    datos.arlNivelRiesgo = romanos[nivel] ?? nivel.toUpperCase();
  }
  return datos;
}

// La primera fila de la tabla de actividades, columna por columna. Las columnas salen de los
// títulos de la tabla (el límite entre dos es el punto medio de sus títulos) y cada fila, de su
// fecha de inicio. Si la tabla no se reconoce entera, no se devuelve nada.
function primeraActividad(paginas: TextoPosicionado[][]): Partial<DatosBitacora> | null {
  const titulos: [keyof DatosBitacora, RegExp][] = [
    ["descripcion", /^Descripci[óo]n de la actividad/i],
    ["competencias", /^Competencias del programa de formaci[óo]n/i],
    ["fechaInicio", /^Fecha de inicio/i],
    ["fechaFin", /^Fecha de fin/i],
    ["evidenciaCumplimiento", /^Evidencia de cumplimiento/i],
    ["observaciones", /^Observaciones, inasistencias/i],
  ];
  for (const pagina of paginas) {
    const columnas = titulos.map(([clave, patron]) => {
      const t = pagina.find((i) => patron.test(i.s.trim()));
      return t ? { clave, centro: t.x + t.w / 2, y: t.y } : null;
    });
    if (columnas.some((c) => !c)) continue;
    const cols = (columnas as { clave: keyof DatosBitacora; centro: number; y: number }[]).sort((a, b) => a.centro - b.centro);
    if (cols[0].clave !== "descripcion" || cols[2].clave !== "fechaInicio") continue;
    const techo = Math.min(...cols.map((c) => c.y));
    // Los títulos de la tabla ocupan varios renglones: se mira desde el último renglón que los
    // contiene hacia abajo, hasta la sección de la ARL.
    const finTitulos = Math.min(
      ...pagina
        .filter((i) => i.y <= techo + 12 && i.y >= techo - 25 && /\(?dd\/mm\/aa\)?|filas sean necesarias|es el caso|jefe inmediato|desarrollo de la actividad/i.test(i.s))
        .map((i) => i.y),
      techo,
    );
    const arl = pagina.find((i) => /Informaci[óo]n afiliaci[óo]n a la ARL/i.test(i.s));
    const piso = arl ? arl.y : -Infinity;
    const limites = cols.slice(1).map((c, k) => (cols[k].centro + c.centro) / 2);
    const columnaDe = (i: TextoPosicionado) => cols[limites.filter((l) => i.x + i.w / 2 > l).length].clave;

    const cuerpo = pagina.filter((i) => i.y < finTitulos - 1 && i.y > piso + 1);
    const inicios = cuerpo.filter((i) => columnaDe(i) === "fechaInicio" && FECHA.test(i.s.trim())).sort((a, b) => b.y - a.y);
    if (!inicios.length) return null;
    const fila = inicios[0].y;
    const abajo = inicios[1] ? (fila + inicios[1].y) / 2 : piso;
    const enFila = cuerpo.filter((i) => i.y > abajo && i.y < finTitulos - 1);

    const datos: Partial<DatosBitacora> = {};
    for (const { clave } of cols) {
      const piezas = renglones(enFila.filter((i) => columnaDe(i) === clave)).map(unirTextos);
      const valor = piezas.join(" ").replace(/\s+/g, " ").trim();
      if (valor) (datos as Record<string, string>)[clave] = valor;
    }
    if (datos.fechaInicio && !FECHA.test(datos.fechaInicio)) delete datos.fechaInicio;
    if (datos.fechaFin && !FECHA.test(datos.fechaFin)) delete datos.fechaFin;
    return datos.descripcion ? datos : null;
  }
  return null;
}

