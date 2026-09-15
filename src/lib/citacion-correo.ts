// Redacción de la citación a una reunión (Momento 1, 2 o 3) y de su invitación de calendario,
// separada del envío (`sendCitacionEmail` en src/lib/mailer.ts). No usa variables de entorno ni
// red, así que se puede probar sin SMTP: en local las variables de correo están enmascaradas.
import type { EventAttributes } from "ics";

// Fecha "YYYY-MM-DD" y horas "HH:mm", tal como las guarda la app.
export type HorarioReunion = { fecha: string; horaInicio: string; horaFin: string };

// Colombia está siempre en UTC−5 (no tiene horario de verano).
const DESFASE_COLOMBIA_HORAS = 5;

function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fechaLegible(fecha: string): string {
  return new Date(`${fecha}T00:00:00.000Z`).toLocaleDateString("es-CO", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function horarioLegible(h: HorarioReunion): string {
  return `${fechaLegible(h.fecha)}, de ${h.horaInicio} a ${h.horaFin}`;
}

// Validación mínima de formato. La librería de calendario rechaza la invitación ENTERA si una sola
// dirección no es válida, y con ella se caía el correo completo: mejor dejar fuera de la
// invitación esa dirección que dejar a todos sin la citación.
export function esCorreoValido(correo: string): boolean {
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(correo.trim());
}

// Devuelve el horario anterior solo si de verdad cambió el día o la franja. Volver a guardar la
// misma fecha no es una reprogramación: en ese caso se reenvía la citación normal.
export function cambioDeHorario(
  anterior: HorarioReunion | null,
  nuevo: HorarioReunion,
): HorarioReunion | null {
  if (!anterior) return null;
  const igual =
    anterior.fecha === nuevo.fecha &&
    anterior.horaInicio === nuevo.horaInicio &&
    anterior.horaFin === nuevo.horaFin;
  return igual ? null : anterior;
}

// Requisito §3.2: al reprogramar una reunión, se notifica el cambio a todas las partes. Por eso
// la reprogramación tiene su propio asunto y muestra el horario anterior junto al nuevo: con el
// texto de siempre ("Se ha agendado…") nadie podía saber que la reunión se había movido.
export function componerCitacion(p: {
  titulo: string;
  aprendizNombre: string;
  horario: HorarioReunion;
  videollamadaUrl: string;
  anterior?: HorarioReunion | null;
  // Texto adicional, p. ej. el motivo de una reunión extraordinaria.
  detalle?: string | null;
  // Solo al reprogramar: quién movió la reunión y por qué, cuando no fue el aprendiz.
  reprogramadaPor?: string | null;
  motivoCambio?: string | null;
}): { subject: string; text: string; html: string } {
  const tituloMin = p.titulo.toLowerCase();

  if (p.anterior) {
    const extras: [string, string][] = [
      ...(p.reprogramadaPor ? [["Reprogramada por", p.reprogramadaPor] as [string, string]] : []),
      ...(p.motivoCambio ? [["Motivo del cambio", p.motivoCambio] as [string, string]] : []),
      ...(p.detalle ? [["Motivo de la reunión", p.detalle] as [string, string]] : []),
    ];
    return {
      subject: `Reunión reprogramada: ${p.titulo} - ${p.aprendizNombre}`,
      text: [
        `La videollamada de ${tituloMin} (etapa productiva) cambió de fecha u hora.`,
        "",
        `Antes: ${horarioLegible(p.anterior)}`,
        `Ahora: ${horarioLegible(p.horario)}`,
        "",
        `Unirse a la videollamada: ${p.videollamadaUrl}`,
        "",
        `Aprendiz: ${p.aprendizNombre}`,
        ...extras.map(([k, v]) => `${k}: ${v}`),
        "",
        "La invitación de calendario adjunta reemplaza a la anterior.",
      ].join("\n"),
      html: [
        `<p>La <strong>videollamada</strong> de ${escaparHtml(tituloMin)} (etapa productiva) <strong>cambió de fecha u hora</strong>.</p>`,
        "<ul>",
        `<li><strong>Antes:</strong> <s>${escaparHtml(horarioLegible(p.anterior))}</s></li>`,
        `<li><strong>Ahora:</strong> ${escaparHtml(horarioLegible(p.horario))}</li>`,
        "</ul>",
        `<p><a href="${escaparHtml(p.videollamadaUrl)}">Unirse a la videollamada</a></p>`,
        `<p><strong>Aprendiz:</strong> ${escaparHtml(p.aprendizNombre)}</p>`,
        ...extras.map(([k, v]) => `<p><strong>${k}:</strong> ${escaparHtml(v)}</p>`),
        "<p>La invitación de calendario adjunta reemplaza a la anterior.</p>",
      ].join("\n"),
    };
  }

  return {
    subject: `Videollamada: ${p.titulo} - ${p.aprendizNombre}`,
    text: [
      `Se ha agendado una videollamada de ${tituloMin} (etapa productiva).`,
      "",
      `Unirse a la videollamada: ${p.videollamadaUrl}`,
      "",
      `Aprendiz: ${p.aprendizNombre}`,
      `Fecha: ${fechaLegible(p.horario.fecha)}`,
      `Hora: ${p.horario.horaInicio} - ${p.horario.horaFin}`,
      ...(p.detalle ? [`Motivo: ${p.detalle}`] : []),
    ].join("\n"),
    html: [
      `<p>Se ha agendado una <strong>videollamada</strong> de ${escaparHtml(tituloMin)} (etapa productiva).</p>`,
      `<p><a href="${escaparHtml(p.videollamadaUrl)}">Unirse a la videollamada</a></p>`,
      "<ul>",
      `<li><strong>Aprendiz:</strong> ${escaparHtml(p.aprendizNombre)}</li>`,
      `<li><strong>Fecha:</strong> ${escaparHtml(fechaLegible(p.horario.fecha))}</li>`,
      `<li><strong>Hora:</strong> ${p.horario.horaInicio} - ${p.horario.horaFin}</li>`,
      ...(p.detalle ? [`<li><strong>Motivo:</strong> ${escaparHtml(p.detalle)}</li>`] : []),
      "</ul>",
      "<p>Esta invitación se agregó también como evento de calendario adjunto.</p>",
    ].join("\n"),
  };
}

// Invitación de calendario (.ics) de la reunión.
//
// - UID fijo por reunión y SEQUENCE creciente: al reprogramar, el calendario de cada destinatario
//   ACTUALIZA el evento que ya tenía. Antes no llevaba UID, y cada reprogramación dejaba el
//   evento viejo y el nuevo en el calendario de todos. SEQUENCE usa los segundos transcurridos
//   desde 1970, que siempre crecen de un envío al siguiente sin tener que guardar un contador.
// - La hora se entrega en UTC, ya convertida desde la hora de Colombia. Si se pasa como hora
//   "local", la librería la interpreta en la zona horaria del servidor, y en Vercel el servidor
//   corre en UTC.
export function atributosInvitacion(p: {
  reunionId: string;
  titulo: string;
  aprendizNombre: string;
  horario: HorarioReunion;
  videollamadaUrl: string;
  organizador: { name: string; email: string };
  asistentes: string[];
  ahora?: Date;
}): EventAttributes {
  const [y, m, d] = p.horario.fecha.split("-").map(Number);
  const [hI, mI] = p.horario.horaInicio.split(":").map(Number);
  const [hF, mF] = p.horario.horaFin.split(":").map(Number);
  const inicio = new Date(Date.UTC(y, m - 1, d, hI + DESFASE_COLOMBIA_HORAS, mI));

  return {
    uid: `${p.reunionId}@sepa.ep.mkdirection.com`,
    sequence: Math.floor((p.ahora ?? new Date()).getTime() / 1000),
    method: "REQUEST",
    start: [
      inicio.getUTCFullYear(),
      inicio.getUTCMonth() + 1,
      inicio.getUTCDate(),
      inicio.getUTCHours(),
      inicio.getUTCMinutes(),
    ],
    startInputType: "utc",
    startOutputType: "utc",
    duration: { minutes: hF * 60 + mF - (hI * 60 + mI) },
    title: `${p.titulo} - ${p.aprendizNombre}`,
    description: `Videollamada de ${p.titulo.toLowerCase()} (etapa productiva).\n\nUnirse: ${p.videollamadaUrl}`,
    location: p.videollamadaUrl,
    url: p.videollamadaUrl,
    organizer: p.organizador,
    attendees: p.asistentes.filter(esCorreoValido).map((email) => ({
      email,
      rsvp: true,
      partstat: "NEEDS-ACTION",
      role: "REQ-PARTICIPANT",
    })),
    status: "CONFIRMED",
    busyStatus: "BUSY",
  };
}

// Recordatorio de una reunión de hoy o de mañana (requisito §3.2), a las mismas personas que
// recibieron la citación. Va sin invitación de calendario: el evento ya está en el calendario de
// todos desde la citación, y reenviarla solo les pediría otra vez que lo acepten.
export function componerRecordatorioReunion(p: {
  titulo: string;
  aprendizNombre: string;
  horario: HorarioReunion;
  videollamadaUrl: string;
  cuando: "hoy" | "manana";
  detalle?: string | null;
}): { subject: string; text: string; html: string } {
  const dia = p.cuando === "hoy" ? "hoy" : "mañana";
  const tituloMin = p.titulo.toLowerCase();
  const cambio = "Si hay que cambiar la fecha o la hora, se reprograma en SEPA y a todos les llega el aviso.";
  return {
    subject: `Recordatorio: ${p.titulo} ${dia} - ${p.aprendizNombre}`,
    text: [
      `Te recordamos que ${dia} es la videollamada de ${tituloMin} (etapa productiva).`,
      "",
      `Fecha: ${fechaLegible(p.horario.fecha)}`,
      `Hora: ${p.horario.horaInicio} - ${p.horario.horaFin}`,
      `Aprendiz: ${p.aprendizNombre}`,
      ...(p.detalle ? [`Motivo: ${p.detalle}`] : []),
      "",
      `Unirse a la videollamada: ${p.videollamadaUrl}`,
      "",
      cambio,
    ].join("\n"),
    html: [
      `<p>Te recordamos que <strong>${dia}</strong> es la videollamada de ${escaparHtml(tituloMin)} (etapa productiva).</p>`,
      "<ul>",
      `<li><strong>Fecha:</strong> ${escaparHtml(fechaLegible(p.horario.fecha))}</li>`,
      `<li><strong>Hora:</strong> ${p.horario.horaInicio} - ${p.horario.horaFin}</li>`,
      `<li><strong>Aprendiz:</strong> ${escaparHtml(p.aprendizNombre)}</li>`,
      ...(p.detalle ? [`<li><strong>Motivo:</strong> ${escaparHtml(p.detalle)}</li>`] : []),
      "</ul>",
      `<p><a href="${escaparHtml(p.videollamadaUrl)}">Unirse a la videollamada</a></p>`,
      `<p style="color:#666">${cambio}</p>`,
    ].join("\n"),
  };
}

// Solicitud de reunión extraordinaria, solo para el instructor. Todavía NO es una citación: la
// citación con enlace a todos sale únicamente cuando el instructor la aprueba.
export function componerSolicitudExtraordinaria(p: {
  aprendizNombre: string;
  horario: HorarioReunion;
  motivo: string;
  solicitadaPor: "APRENDIZ" | "COFORMADOR";
  panelUrl: string;
}): { subject: string; text: string; html: string } {
  const quien =
    p.solicitadaPor === "COFORMADOR"
      ? `${p.aprendizNombre} solicitó una reunión extraordinaria contigo, a petición de su coformador.`
      : `${p.aprendizNombre} solicitó una reunión extraordinaria contigo.`;
  return {
    subject: `Solicitud de reunión extraordinaria — ${p.aprendizNombre}`,
    text: [
      quien,
      "",
      `Fecha propuesta: ${horarioLegible(p.horario)}`,
      `Motivo: ${p.motivo}`,
      "",
      `Apruébala o recházala en SEPA: ${p.panelUrl}`,
      "",
      "Al aprobarla se envía la citación con el enlace de la videollamada al aprendiz y a su coformador.",
    ].join("\n"),
    html: [
      `<p>${escaparHtml(quien)}</p>`,
      "<ul>",
      `<li><strong>Fecha propuesta:</strong> ${escaparHtml(horarioLegible(p.horario))}</li>`,
      `<li><strong>Motivo:</strong> ${escaparHtml(p.motivo)}</li>`,
      "</ul>",
      `<p><a href="${escaparHtml(p.panelUrl)}">Aprobar o rechazar en SEPA</a></p>`,
      "<p>Al aprobarla se envía la citación con el enlace de la videollamada al aprendiz y a su coformador.</p>",
    ].join("\n"),
  };
}

// Aviso al aprendiz de que su instructor no aprobó la reunión extraordinaria, con la razón.
export function componerRechazoExtraordinaria(p: {
  aprendizNombre: string;
  horario: HorarioReunion;
  motivoRechazo: string;
  appUrl: string;
}): { subject: string; text: string; html: string } {
  return {
    subject: "Tu solicitud de reunión extraordinaria no fue aprobada",
    text: [
      `Hola ${p.aprendizNombre},`,
      "",
      `Tu instructor no aprobó la reunión extraordinaria que propusiste para el ${horarioLegible(p.horario)}.`,
      "",
      `Motivo: ${p.motivoRechazo}`,
      "",
      `Puedes proponer otra fecha desde SEPA: ${p.appUrl}`,
    ].join("\n"),
    html: [
      `<p>Hola ${escaparHtml(p.aprendizNombre)},</p>`,
      `<p>Tu instructor no aprobó la reunión extraordinaria que propusiste para el ${escaparHtml(horarioLegible(p.horario))}.</p>`,
      `<p><strong>Motivo:</strong> ${escaparHtml(p.motivoRechazo)}</p>`,
      `<p><a href="${escaparHtml(p.appUrl)}">Proponer otra fecha en SEPA</a></p>`,
    ].join("\n"),
  };
}
