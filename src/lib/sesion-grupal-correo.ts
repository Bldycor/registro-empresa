// Correos de una sesión grupal de un momento (25 nov 2026). Funciones puras, para probarlas sin
// enviar nada. Dos destinatarios distintos:
// - cada aprendiz (con copia a su coformador) recibe su propia citación: no ve los correos de los
//   demás aprendices;
// - el instructor (y Coordinación en el Momento 1) recibe una sola con la lista de convocados.
// La sesión puede ser presencial (con lugar) o virtual (con enlace).

import type { HorarioReunion } from "@/lib/citacion-correo";

export type SesionCorreo = {
  titulo: string; // «Momento 2 (Seguimiento)»
  horario: HorarioReunion;
  modalidad: "PRESENCIAL" | "VIRTUAL";
  lugar: string | null;
  videollamadaUrl: string | null;
};

function escaparHtml(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function fechaLegible(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function horarioLegible(h: HorarioReunion): string {
  return `${fechaLegible(h.fecha)}, ${h.horaInicio} - ${h.horaFin}`;
}

// Dónde es la reunión, en una línea.
export function dondeLegible(s: Pick<SesionCorreo, "modalidad" | "lugar">): string {
  return s.modalidad === "PRESENCIAL" ? `Presencial${s.lugar ? `, en ${s.lugar}` : ""}` : "Virtual";
}

export function componerSesionGrupal(p: {
  sesion: SesionCorreo;
  para: "APRENDIZ" | "INSTRUCTOR";
  aprendizNombre?: string; // para el aprendiz
  convocados?: string[]; // para el instructor
  anterior?: HorarioReunion | null; // al reprogramar
  cancelada?: boolean;
}): { subject: string; text: string; html: string } {
  const s = p.sesion;
  const asunto = p.cancelada
    ? `Sesión grupal cancelada: ${s.titulo}`
    : p.anterior
      ? `Sesión grupal reprogramada: ${s.titulo}`
      : `Sesión grupal: ${s.titulo}`;
  const intro = p.cancelada
    ? `Se canceló la sesión grupal del ${s.titulo} (etapa productiva).`
    : p.anterior
      ? `La sesión grupal del ${s.titulo} (etapa productiva) cambió de fecha, hora o lugar.`
      : `Tu instructor convocó una sesión grupal del ${s.titulo} (etapa productiva).`;
  const filas: [string, string][] = [
    ...(p.anterior && !p.cancelada ? [["Antes", horarioLegible(p.anterior)] as [string, string]] : []),
    [p.anterior && !p.cancelada ? "Ahora" : "Fecha y hora", horarioLegible(s.horario)],
    ["Modalidad", dondeLegible(s)],
    ...(p.para === "APRENDIZ" && p.aprendizNombre ? [["Aprendiz", p.aprendizNombre] as [string, string]] : []),
  ];
  const enlace = !p.cancelada && s.modalidad === "VIRTUAL" && s.videollamadaUrl ? s.videollamadaUrl : null;
  const nota =
    p.cancelada
      ? p.para === "APRENDIZ"
        ? "Tu momento queda sin agendar: podrás agendarlo de nuevo en SEPA o esperar una nueva convocatoria de tu instructor."
        : "Los momentos de los convocados quedaron sin agendar."
      : p.para === "APRENDIZ"
        ? "Aunque la reunión es grupal, tu evidencia es individual: diligencia y envía tu formato GFPI-F-023 en SEPA como siempre."
        : "Cada aprendiz conserva su evidencia individual: su formato y su valoración se revisan por separado.";
  const convocados = p.para === "INSTRUCTOR" && p.convocados?.length ? p.convocados : null;

  return {
    subject: asunto,
    text: [
      intro,
      "",
      ...filas.map(([k, v]) => `${k}: ${v}`),
      ...(enlace ? ["", `Unirse a la videollamada: ${enlace}`] : []),
      ...(convocados ? ["", `Convocados (${convocados.length}):`, ...convocados.map((n) => `- ${n}`)] : []),
      "",
      nota,
    ].join("\n"),
    html: [
      `<p>${escaparHtml(intro)}</p>`,
      "<ul>",
      ...filas.map(([k, v]) =>
        k === "Antes"
          ? `<li><strong>${k}:</strong> <s>${escaparHtml(v)}</s></li>`
          : `<li><strong>${k}:</strong> ${escaparHtml(v)}</li>`,
      ),
      "</ul>",
      ...(enlace ? [`<p><a href="${escaparHtml(enlace)}">Unirse a la videollamada</a></p>`] : []),
      ...(convocados
        ? [`<p><strong>Convocados (${convocados.length}):</strong></p><ul>`, ...convocados.map((n) => `<li>${escaparHtml(n)}</li>`), "</ul>"]
        : []),
      `<p>${escaparHtml(nota)}</p>`,
    ].join("\n"),
  };
}
