// Redacción del correo de avisos de plazo, separada del envío (`sendAvisoPlazosEmail` en
// src/lib/mailer.ts). Es una función pura —sin imports ni variables de entorno— por una razón
// práctica: en local las variables de correo llegan enmascaradas y no hay forma de enviar de
// verdad, así que esta es la única parte del aviso que se puede probar antes de producción.
//
// Va dirigido al aprendiz, con copia al instructor de su ficha (decisión de Coordinación). El
// coformador va en copia solo cuando hay algo ya vencido, que es cuando el requisito §3.3 lo pide:
// un recordatorio de "vence pronto" es asunto del aprendiz, no de la empresa. Un solo correo por
// aprendiz y por día, con todas sus entregas nuevas, para no mandar un correo por bitácora.

export type AvisoPlazoCorreo = {
  etiqueta: string;
  fechaLimite: Date;
  estado: "proxima" | "vencida";
  dias: number;
};

function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Las fechas límite son días de calendario guardados a medianoche UTC: se muestran en UTC.
function fecha(d: Date): string {
  return d.toLocaleDateString("es-CO", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function plural(n: number): string {
  return n === 1 ? "día" : "días";
}

function lineaVencida(a: AvisoPlazoCorreo): string {
  return `${a.etiqueta}: venció el ${fecha(a.fechaLimite)} (hace ${a.dias} ${plural(a.dias)})`;
}

function lineaProxima(a: AvisoPlazoCorreo): string {
  return a.dias === 0
    ? `${a.etiqueta}: vence hoy, ${fecha(a.fechaLimite)}`
    : `${a.etiqueta}: vence el ${fecha(a.fechaLimite)} (en ${a.dias} ${plural(a.dias)})`;
}

export function componerAvisoPlazos(params: {
  aprendizNombre: string;
  aprendizEmail: string;
  instructorEmail: string | null;
  coformadorEmail: string | null;
  avisos: AvisoPlazoCorreo[];
  // Enlace a la sección de Etapa Productiva de la plataforma.
  appUrl: string;
}): { to: string; cc: string[]; destinatarios: string[]; subject: string; text: string; html: string } {
  const { aprendizNombre, aprendizEmail, instructorEmail, coformadorEmail, avisos, appUrl } = params;
  const vencidas = avisos.filter((a) => a.estado === "vencida");
  const proximas = avisos.filter((a) => a.estado === "proxima");
  const hayVencidas = vencidas.length > 0;

  const normalizar = (e: string | null) => (e ?? "").trim().toLowerCase();
  const propio = normalizar(aprendizEmail);
  const instructorEnCopia = Boolean(normalizar(instructorEmail)) && normalizar(instructorEmail) !== propio;
  const coformadorEnCopia =
    hayVencidas && Boolean(normalizar(coformadorEmail)) && normalizar(coformadorEmail) !== propio;

  const cc: string[] = [];
  for (const [incluir, correo] of [
    [instructorEnCopia, instructorEmail],
    [coformadorEnCopia, coformadorEmail],
  ] as const) {
    const limpio = (correo ?? "").trim();
    if (incluir && !cc.some((x) => x.toLowerCase() === limpio.toLowerCase())) cc.push(limpio);
  }

  const copia =
    instructorEnCopia && coformadorEnCopia
      ? "Este aviso se envía con copia a tu instructor de seguimiento y a tu coformador."
      : instructorEnCopia
        ? "Este aviso se envía con copia a tu instructor de seguimiento."
        : coformadorEnCopia
          ? "Este aviso se envía con copia a tu coformador."
          : "";

  const subject = hayVencidas
    ? `Entregas vencidas de tu Etapa Productiva — ${aprendizNombre}`
    : `Recordatorio: entregas próximas a vencer — ${aprendizNombre}`;

  const text = [
    `Hola ${aprendizNombre},`,
    "",
    ...(hayVencidas
      ? ["Tienes entregas de tu Etapa Productiva cuya fecha límite ya pasó:", "", ...vencidas.map((a) => `- ${lineaVencida(a)}`)]
      : []),
    ...(proximas.length
      ? [
          ...(hayVencidas ? ["", "Y estas vencen pronto:", ""] : ["Se acerca la fecha límite de estas entregas de tu Etapa Productiva:", ""]),
          ...proximas.map((a) => `- ${lineaProxima(a)}`),
        ]
      : []),
    "",
    `Entra a la plataforma para ponerte al día: ${appUrl}`,
    ...(copia ? ["", copia] : []),
  ].join("\n");

  const lista = (items: AvisoPlazoCorreo[], linea: (a: AvisoPlazoCorreo) => string) =>
    `<ul>${items.map((a) => `<li>${escaparHtml(linea(a))}</li>`).join("")}</ul>`;
  const html = [
    `<p>Hola ${escaparHtml(aprendizNombre)},</p>`,
    hayVencidas
      ? `<p>Tienes entregas de tu Etapa Productiva cuya <strong>fecha límite ya pasó</strong>:</p>${lista(vencidas, lineaVencida)}`
      : "",
    proximas.length
      ? `<p>${hayVencidas ? "Y estas vencen pronto:" : "Se acerca la fecha límite de estas entregas de tu Etapa Productiva:"}</p>${lista(proximas, lineaProxima)}`
      : "",
    `<p><a href="${escaparHtml(appUrl)}">Entrar a la plataforma</a> para ponerte al día.</p>`,
    copia ? `<p style="color:#666">${copia}</p>` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { to: aprendizEmail.trim(), cc, destinatarios: [aprendizEmail.trim(), ...cc], subject, text, html };
}
