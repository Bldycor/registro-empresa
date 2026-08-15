import nodemailer, { type Transporter } from "nodemailer";
import { createEvent, type EventAttributes } from "ics";
import { getVideoConferenceUrl } from "@/lib/video";

let cachedTransporter: Transporter | null = null;
let usingTestAccount = false;

async function getTransporter(): Promise<Transporter> {
  if (cachedTransporter) return cachedTransporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT ?? 587),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    return cachedTransporter;
  }

  // No hay SMTP configurado: usamos una cuenta de prueba (Ethereal) solo para
  // desarrollo. Los correos NO se entregan de verdad; se pueden ver con la
  // URL de vista previa que se imprime en la consola del servidor.
  usingTestAccount = true;
  const testAccount = await nodemailer.createTestAccount();
  cachedTransporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  return cachedTransporter;
}

function buildIcsEvent(attributes: EventAttributes): Promise<string> {
  return new Promise((resolve, reject) => {
    createEvent(attributes, (error, value) => {
      if (error) reject(error);
      else resolve(value);
    });
  });
}

function parseStartAndDuration(fecha: string, horaInicio: string, horaFin: string) {
  const [year, month, day] = fecha.split("-").map(Number);
  const [hStart, mStart] = horaInicio.split(":").map(Number);
  const [hEnd, mEnd] = horaFin.split(":").map(Number);
  const durationMinutes = hEnd * 60 + mEnd - (hStart * 60 + mStart);

  return {
    start: [year, month, day, hStart, mStart] as [number, number, number, number, number],
    duration: { minutes: durationMinutes },
  };
}

export async function sendCitacionEmail({
  concertacionId,
  aprendizNombre,
  aprendizEmail,
  coformadorEmail,
  fecha,
  horaInicio,
  horaFin,
}: {
  concertacionId: string;
  aprendizNombre: string;
  aprendizEmail: string;
  coformadorEmail: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}) {
  const coordinadorEmail = process.env.CITACION_EMAIL || "bcoba@sena.edu.co";
  const from = process.env.EMAIL_FROM || "no-responder@registro-empresa.local";
  const to = Array.from(
    new Set([coordinadorEmail, aprendizEmail, coformadorEmail].filter(Boolean))
  );

  const videollamadaUrl = getVideoConferenceUrl(concertacionId);
  const { start, duration } = parseStartAndDuration(fecha, horaInicio, horaFin);

  const fechaLegible = new Date(`${fecha}T00:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const icsContent = await buildIcsEvent({
    start,
    duration,
    title: `Concertación de funciones - ${aprendizNombre}`,
    description: `Videollamada de concertación de funciones (etapa productiva).\n\nUnirse: ${videollamadaUrl}`,
    location: videollamadaUrl,
    url: videollamadaUrl,
    organizer: { name: "Registro Empresa", email: from },
    attendees: to.map((email) => ({
      email,
      rsvp: true,
      partstat: "NEEDS-ACTION",
      role: "REQ-PARTICIPANT",
    })),
    status: "CONFIRMED",
    busyStatus: "BUSY",
  });

  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from,
    to,
    subject: `Videollamada: Concertación de funciones - ${aprendizNombre}`,
    text: `Se ha agendado una videollamada de concertación de funciones (etapa productiva).\n\nUnirse a la videollamada: ${videollamadaUrl}\n\nAprendiz: ${aprendizNombre}\nFecha: ${fechaLegible}\nHora: ${horaInicio} - ${horaFin}`,
    html: `
      <p>Se ha agendado una <strong>videollamada</strong> de concertación de funciones (etapa productiva).</p>
      <p><a href="${videollamadaUrl}">Unirse a la videollamada</a></p>
      <ul>
        <li><strong>Aprendiz:</strong> ${aprendizNombre}</li>
        <li><strong>Fecha:</strong> ${fechaLegible}</li>
        <li><strong>Hora:</strong> ${horaInicio} - ${horaFin}</li>
      </ul>
      <p>Esta invitación se agregó también como evento de calendario adjunto.</p>
    `,
    icalEvent: {
      filename: "invitacion.ics",
      method: "REQUEST",
      content: icsContent,
    },
  });

  if (usingTestAccount) {
    console.log(
      `[mailer] Cuenta de prueba (Ethereal) — vista previa del correo: ${nodemailer.getTestMessageUrl(info)}`
    );
  }

  return { info, videollamadaUrl };
}
