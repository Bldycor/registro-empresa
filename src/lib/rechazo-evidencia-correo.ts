// Redacción del correo que avisa que una evidencia fue rechazada (pedido del 10 nov 2026). Función
// pura: es lo único de este aviso que se puede probar en local, porque el correo solo sale en
// producción. Texto formal y conciso: qué se rechazó, quién, la observación tal como se escribió, la
// urgencia de corregir y volver a subir en PDF totalmente diligenciado, y el enlace de ingreso.

export type EvidenciaRechazada =
  | { tipo: "ALTERNATIVA" }
  | { tipo: "FORMALIZACION" }
  | { tipo: "BITACORA"; numero: number }
  | { tipo: "CERTIFICACION" };

// Nombre de la evidencia en el correo y la pestaña de SEPA donde el aprendiz la corrige.
export function describirEvidencia(e: EvidenciaRechazada): { nombre: string; pestana: string } {
  switch (e.tipo) {
    case "ALTERNATIVA":
      return { nombre: "Selección de alternativa de etapa productiva (GFPI-F-165)", pestana: "Alternativa EP" };
    case "FORMALIZACION":
      return { nombre: "Formalización de la etapa productiva", pestana: "Formalización" };
    case "BITACORA":
      return { nombre: `Bitácora N° ${e.numero} (GFPI-F-147)`, pestana: "Bitácoras" };
    case "CERTIFICACION":
      return { nombre: "Certificación del empresario", pestana: "Certificación" };
  }
}

function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function componerRechazoEvidencia(p: {
  aprendizNombre: string;
  evidencia: EvidenciaRechazada;
  // Quién la rechazó y con qué rol («instructor de seguimiento», «Coordinación de Etapa Productiva»).
  revisorNombre: string;
  revisorRol: string;
  // Lo que escribió el revisor. Es opcional al rechazar: si no hay, el correo lo dice; no se inventa.
  observacion: string | null;
  // Enlace de ingreso a SEPA.
  loginUrl: string;
}): { subject: string; text: string; html: string } {
  const { nombre, pestana } = describirEvidencia(p.evidencia);
  const observacion = p.observacion?.trim() || null;
  const hecho = `Le informamos que su evidencia «${nombre}» fue rechazada por ${p.revisorNombre}, ${p.revisorRol}.`;
  const sinObservacion =
    "El revisor no registró una observación. Comuníquese con su instructor de seguimiento para conocer el motivo.";
  const urgencia =
    "Es urgente que la corrija y la suba nuevamente a SEPA, en PDF y totalmente diligenciada. Mientras no sea avalada, la evidencia no cuenta como entregada en su seguimiento.";
  const donde = `Después de ingresar, abra la pestaña «${pestana}».`;
  const copia = "Este mensaje se envía con copia a su instructor de seguimiento y a su coformador.";
  const firma = "SEPA · Seguimiento de Etapa Productiva de Aprendices";

  return {
    subject: `SEPA · Evidencia rechazada: ${nombre}. Corríjala y súbala de nuevo`,
    text: [
      `Cordial saludo, ${p.aprendizNombre}:`,
      "",
      hecho,
      "",
      observacion ? `Observación: ${observacion}` : sinObservacion,
      "",
      urgencia,
      "",
      `Ingreso a SEPA: ${p.loginUrl}`,
      donde,
      "",
      copia,
      "",
      firma,
    ].join("\n"),
    html: [
      `<p>Cordial saludo, ${escaparHtml(p.aprendizNombre)}:</p>`,
      `<p>Le informamos que su evidencia <strong>«${escaparHtml(nombre)}»</strong> fue <strong>rechazada</strong> por ${escaparHtml(p.revisorNombre)}, ${escaparHtml(p.revisorRol)}.</p>`,
      observacion
        ? `<p><strong>Observación:</strong> ${escaparHtml(observacion).replace(/\n/g, "<br>")}</p>`
        : `<p>${escaparHtml(sinObservacion)}</p>`,
      `<p><strong>${escaparHtml(urgencia)}</strong></p>`,
      `<p><a href="${escaparHtml(p.loginUrl)}">Ingresar a SEPA</a><br>${escaparHtml(donde)}</p>`,
      `<p>${escaparHtml(copia)}</p>`,
      `<p>${escaparHtml(firma)}</p>`,
    ].join("\n"),
  };
}
