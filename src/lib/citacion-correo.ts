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
}): { subject: string; text: string; html: string } {
  const tituloMin = p.titulo.toLowerCase();

  if (p.anterior) {
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
    ].join("\n"),
    html: [
      `<p>Se ha agendado una <strong>videollamada</strong> de ${escaparHtml(tituloMin)} (etapa productiva).</p>`,
      `<p><a href="${escaparHtml(p.videollamadaUrl)}">Unirse a la videollamada</a></p>`,
      "<ul>",
      `<li><strong>Aprendiz:</strong> ${escaparHtml(p.aprendizNombre)}</li>`,
      `<li><strong>Fecha:</strong> ${escaparHtml(fechaLegible(p.horario.fecha))}</li>`,
      `<li><strong>Hora:</strong> ${p.horario.horaInicio} - ${p.horario.horaFin}</li>`,
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
