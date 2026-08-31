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

const roleLabel: Record<string, string> = {
  APRENDIZ: "Aprendiz",
  INSTRUCTOR: "Instructor",
  COORDINADOR: "Coordinador",
};

// Notificación de bienvenida al registrarse: confirma la creación de la cuenta y
// recuerda las credenciales de acceso (usuario = correo, y la contraseña elegida).
// OJO seguridad: enviar la contraseña en texto plano por correo no es la práctica
// más segura (el correo no es un canal cifrado ni controlado por nosotros); se
// implementa así porque fue un requerimiento explícito. Si más adelante se quiere
// reforzar esto, lo ideal sería reemplazarlo por un enlace de "activa tu cuenta /
// crea tu contraseña" de un solo uso, sin transmitir la contraseña real.
export async function sendWelcomeEmail({
  nombres,
  email,
  cedula,
  password,
  role,
}: {
  nombres: string;
  email: string;
  cedula: string;
  password: string;
  role: string;
}) {
  const from = process.env.EMAIL_FROM || "no-responder@registro-empresa.local";
  const rolLegible = roleLabel[role] ?? role;
  const loginUrl = process.env.APP_URL
    ? `${process.env.APP_URL.replace(/\/$/, "")}/login`
    : "/login";

  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from,
    to: email,
    subject: "Bienvenido a Registro Empresa — tu cuenta fue creada",
    text: `Hola ${nombres},\n\nTu cuenta en Registro Empresa (SENA - Etapa Productiva) fue creada correctamente como ${rolLegible}.\n\nUsuario (cédula): ${cedula}\nContraseña: ${password}\n\nIngresa en: ${loginUrl}\n\nPor seguridad, te recomendamos cambiar esta contraseña luego de tu primer ingreso. Si alguna vez la olvidas, puedes recuperarla desde el enlace "¿Olvidaste tu contraseña?" en la pantalla de inicio de sesión.`,
    html: `
      <p>Hola ${nombres},</p>
      <p>Tu cuenta en <strong>Registro Empresa</strong> (SENA - Etapa Productiva) fue creada correctamente como <strong>${rolLegible}</strong>.</p>
      <ul>
        <li><strong>Usuario (cédula):</strong> ${cedula}</li>
        <li><strong>Contraseña:</strong> ${password}</li>
      </ul>
      <p><a href="${loginUrl}">Ingresar a la plataforma</a></p>
      <p>Por seguridad, te recomendamos cambiar esta contraseña luego de tu primer ingreso. Si alguna vez la olvidas, puedes recuperarla desde el enlace "¿Olvidaste tu contraseña?" en la pantalla de inicio de sesión.</p>
    `,
  });

  if (usingTestAccount) {
    console.log(
      `[mailer] Cuenta de prueba (Ethereal) — vista previa del correo de bienvenida: ${nodemailer.getTestMessageUrl(info)}`
    );
  }

  return { info };
}

// Citación por videollamada (respaldo Jitsi cuando no hay integración de Google Calendar) —
// reutilizada por Concertación (Momento 1) y por las evaluaciones de seguimiento/cierre
// (Momento 2/3): `titulo` identifica la reunión en el asunto/ICS, `destinatarios` ya trae
// resueltos los correos correctos según quién revisa esa reunión (coordinador fijo para
// Concertación, instructor de la ficha para Momento 2/3).
export async function sendCitacionEmail({
  reunionId,
  titulo = "Concertación de funciones",
  prefijoSala,
  aprendizNombre,
  destinatarios,
  fecha,
  horaInicio,
  horaFin,
}: {
  reunionId: string;
  titulo?: string;
  prefijoSala?: string;
  aprendizNombre: string;
  destinatarios: string[];
  fecha: string;
  horaInicio: string;
  horaFin: string;
}) {
  const from = process.env.EMAIL_FROM || "no-responder@registro-empresa.local";
  const to = Array.from(new Set(destinatarios.filter(Boolean)));

  const videollamadaUrl = getVideoConferenceUrl(reunionId, prefijoSala);
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
    title: `${titulo} - ${aprendizNombre}`,
    description: `Videollamada de ${titulo.toLowerCase()} (etapa productiva).\n\nUnirse: ${videollamadaUrl}`,
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
    subject: `Videollamada: ${titulo} - ${aprendizNombre}`,
    text: `Se ha agendado una videollamada de ${titulo.toLowerCase()} (etapa productiva).\n\nUnirse a la videollamada: ${videollamadaUrl}\n\nAprendiz: ${aprendizNombre}\nFecha: ${fechaLegible}\nHora: ${horaInicio} - ${horaFin}`,
    html: `
      <p>Se ha agendado una <strong>videollamada</strong> de ${titulo.toLowerCase()} (etapa productiva).</p>
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

// Enlace de recuperación de contraseña (flujo "olvidé mi contraseña"). El usuario se identifica
// con su cédula, pero el enlace se envía al correo registrado en la cuenta — es el único canal
// que confirma que quien pide el cambio es el dueño real de la cuenta. El enlace expira pronto
// (ver expiresAt del token) y solo sirve una vez.
export async function sendPasswordResetEmail({
  nombres,
  email,
  resetUrl,
}: {
  nombres: string;
  email: string;
  resetUrl: string;
}) {
  const from = process.env.EMAIL_FROM || "no-responder@registro-empresa.local";

  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from,
    to: email,
    subject: "Recupera tu contraseña — Registro Empresa",
    text: `Hola ${nombres},\n\nRecibimos una solicitud para restablecer tu contraseña en Registro Empresa (SENA - Etapa Productiva).\n\nCrea una nueva contraseña aquí: ${resetUrl}\n\nEste enlace es válido por 1 hora y solo se puede usar una vez. Si no solicitaste este cambio, puedes ignorar este correo — tu contraseña actual sigue siendo válida.`,
    html: `
      <p>Hola ${nombres},</p>
      <p>Recibimos una solicitud para restablecer tu contraseña en <strong>Registro Empresa</strong> (SENA - Etapa Productiva).</p>
      <p><a href="${resetUrl}">Crear una nueva contraseña</a></p>
      <p>Este enlace es válido por 1 hora y solo se puede usar una vez.</p>
      <p>Si no solicitaste este cambio, puedes ignorar este correo — tu contraseña actual sigue siendo válida.</p>
    `,
  });

  if (usingTestAccount) {
    console.log(
      `[mailer] Cuenta de prueba (Ethereal) — vista previa del correo de recuperación: ${nodemailer.getTestMessageUrl(info)}`
    );
  }

  return { info };
}
