import nodemailer, { type Transporter } from "nodemailer";
import { createEvent, type EventAttributes } from "ics";
import { readFile } from "fs/promises";
import path from "path";
import { getVideoConferenceUrl } from "@/lib/video";
import { componerAvisoPlazos, type AvisoPlazoCorreo } from "@/lib/aviso-plazos-correo";
import {
  atributosInvitacion,
  componerCitacion,
  componerRechazoExtraordinaria,
  componerSolicitudExtraordinaria,
  type HorarioReunion,
} from "@/lib/citacion-correo";

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

// `EMAIL_FROM` puede venir en formato "Nombre <correo@dominio.com>" (válido para el header `from`
// de nodemailer) — pero el validador de `ics` exige `organizer.email` como dirección desnuda, sin
// el nombre ni los `<>`, o rechaza el evento entero con "organizer.email must be a valid email".
function direccionDesnuda(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match ? match[1].trim() : from.trim();
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
// resueltos los correos correctos: Coordinación, instructor, aprendiz y coformador en la
// Concertación; instructor, aprendiz y coformador en los Momentos 2 y 3.
export async function sendCitacionEmail({
  reunionId,
  titulo = "Concertación de funciones",
  prefijoSala,
  aprendizNombre,
  destinatarios,
  fecha,
  horaInicio,
  horaFin,
  videollamadaUrl: videollamadaUrlOverride,
  anterior = null,
  detalle = null,
}: {
  reunionId: string;
  titulo?: string;
  prefijoSala?: string;
  aprendizNombre: string;
  destinatarios: string[];
  fecha: string;
  horaInicio: string;
  horaFin: string;
  // Enlace real ya resuelto (p. ej. Google Meet) para que el correo enlace exactamente a la
  // misma videollamada que ve el aprendiz en la app — si se omite, se genera el enlace Jitsi de
  // respaldo a partir de `reunionId`/`prefijoSala`.
  videollamadaUrl?: string;
  // Horario que tenía la reunión antes, cuando se está reprogramando (ver `cambioDeHorario`):
  // el correo pasa a decir que la reunión cambió y muestra el horario anterior y el nuevo.
  anterior?: HorarioReunion | null;
  // Texto adicional para el correo, p. ej. el motivo de una reunión extraordinaria.
  detalle?: string | null;
}) {
  const from = process.env.EMAIL_FROM || "no-responder@registro-empresa.local";
  const to = Array.from(new Set(destinatarios.filter(Boolean)));

  const videollamadaUrl = videollamadaUrlOverride || getVideoConferenceUrl(reunionId, prefijoSala);
  const horario = { fecha, horaInicio, horaFin };
  const correo = componerCitacion({ titulo, aprendizNombre, horario, videollamadaUrl, anterior, detalle });

  // La invitación de calendario es un complemento del correo, no una condición para enviarlo: si
  // no se puede armar, la citación sale igual, sin el adjunto. Antes, un fallo al armar el .ics
  // tumbaba el envío completo y nadie recibía la citación.
  let icsContent: string | null = null;
  try {
    icsContent = await buildIcsEvent(
      atributosInvitacion({
        reunionId,
        titulo,
        aprendizNombre,
        horario,
        videollamadaUrl,
        organizador: { name: "Registro Empresa", email: direccionDesnuda(from) },
        asistentes: to,
      }),
    );
  } catch (err) {
    console.error("[mailer] No se pudo armar la invitación de calendario; se envía sin adjunto:", err);
  }

  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from,
    to,
    subject: correo.subject,
    text: correo.text,
    html: correo.html,
    ...(icsContent
      ? { icalEvent: { filename: "invitacion.ics", method: "REQUEST", content: icsContent } }
      : {}),
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

// Ficha institucional con los requisitos del proceso de certificación (documentos a entregar,
// encuestas, dependencias involucradas) — se adjunta tal cual al correo de "Por certificar".
const RUTA_FICHA_REQUISITOS_CERTIFICACION = path.join(
  process.cwd(),
  "public/documentos/requisitos-certificacion.pdf"
);

// Aviso de que el instructor marcó al aprendiz como "Por certificar": ya avaló las 6 evidencias
// de Etapa Productiva, así que puede iniciar el trámite institucional de certificación. Se
// adjunta la ficha de requisitos vigente para que sepa exactamente qué entregar y a dónde.
export async function sendPorCertificarEmail({
  nombres,
  email,
}: {
  nombres: string;
  email: string;
}) {
  const from = process.env.EMAIL_FROM || "no-responder@registro-empresa.local";
  const adjunto = await readFile(RUTA_FICHA_REQUISITOS_CERTIFICACION);

  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from,
    to: email,
    subject: "Ya puedes iniciar tu proceso de certificación",
    text: `Hola ${nombres},\n\n¡Buenas noticias! Tu instructor confirmó que has cumplido con todas las evidencias de tu Etapa Productiva y tu registro quedó en estado "Por certificar".\n\nCon esto ya puedes iniciar tu proceso de certificación ante el SENA, entregando los documentos y trámites que se detallan en la ficha de requisitos adjunta a este correo.\n\nCualquier duda sobre el trámite de certificación en sí (no sobre esta plataforma), consulta directamente los datos de contacto que aparecen en la ficha adjunta.`,
    html: `
      <p>Hola ${nombres},</p>
      <p>¡Buenas noticias! Tu instructor confirmó que has cumplido con todas las evidencias de tu Etapa Productiva y tu registro quedó en estado <strong>"Por certificar"</strong>.</p>
      <p>Con esto ya puedes iniciar tu proceso de certificación ante el SENA, entregando los documentos y trámites que se detallan en la <strong>ficha de requisitos adjunta</strong> a este correo.</p>
      <p>Cualquier duda sobre el trámite de certificación en sí (no sobre esta plataforma), consulta directamente los datos de contacto que aparecen en la ficha adjunta.</p>
    `,
    attachments: [
      {
        filename: "Requisitos de certificación.pdf",
        content: adjunto,
        contentType: "application/pdf",
      },
    ],
  });

  if (usingTestAccount) {
    console.log(
      `[mailer] Cuenta de prueba (Ethereal) — vista previa del correo de "Por certificar": ${nodemailer.getTestMessageUrl(info)}`
    );
  }

  return { info };
}

// Aviso de plazos de Etapa Productiva (requisito §3.3). La redacción —destinatarios, copias,
// asunto y cuerpo— la arma `componerAvisoPlazos`; aquí solo se envía.
export async function sendAvisoPlazosEmail(params: {
  aprendizNombre: string;
  aprendizEmail: string;
  instructorEmail: string | null;
  coformadorEmail: string | null;
  avisos: AvisoPlazoCorreo[];
}) {
  const from = process.env.EMAIL_FROM || "no-responder@registro-empresa.local";
  const appUrl = process.env.APP_URL
    ? `${process.env.APP_URL.replace(/\/$/, "")}/formulario/etapa-productiva`
    : "/formulario/etapa-productiva";
  const correo = componerAvisoPlazos({ ...params, appUrl });

  const transporter = await getTransporter();

  const info = await transporter.sendMail({
    from,
    to: correo.to,
    cc: correo.cc.length ? correo.cc : undefined,
    subject: correo.subject,
    text: correo.text,
    html: correo.html,
  });

  if (usingTestAccount) {
    console.log(
      `[mailer] Cuenta de prueba (Ethereal) — vista previa del aviso de plazos: ${nodemailer.getTestMessageUrl(info)}`
    );
  }

  return { info, destinatarios: correo.destinatarios };
}


function urlApp(ruta: string): string {
  return process.env.APP_URL ? `${process.env.APP_URL.replace(/\/$/, "")}${ruta}` : ruta;
}

// Solicitud de reunión extraordinaria: solo al instructor, para que la apruebe o la rechace.
export async function sendSolicitudExtraordinariaEmail(params: {
  instructorEmail: string;
  aprendizNombre: string;
  horario: HorarioReunion;
  motivo: string;
  solicitadaPor: "APRENDIZ" | "COFORMADOR";
}) {
  const from = process.env.EMAIL_FROM || "no-responder@registro-empresa.local";
  const correo = componerSolicitudExtraordinaria({
    ...params,
    panelUrl: urlApp("/formulario/instructor/extraordinarias"),
  });
  const transporter = await getTransporter();
  const info = await transporter.sendMail({ from, to: params.instructorEmail, ...correo });
  if (usingTestAccount) {
    console.log(`[mailer] Vista previa (Ethereal) de la solicitud extraordinaria: ${nodemailer.getTestMessageUrl(info)}`);
  }
  return { info };
}

// Rechazo de la reunión extraordinaria: al aprendiz, con la razón que dio el instructor.
export async function sendRechazoExtraordinariaEmail(params: {
  aprendizEmail: string;
  aprendizNombre: string;
  horario: HorarioReunion;
  motivoRechazo: string;
}) {
  const from = process.env.EMAIL_FROM || "no-responder@registro-empresa.local";
  const correo = componerRechazoExtraordinaria({
    aprendizNombre: params.aprendizNombre,
    horario: params.horario,
    motivoRechazo: params.motivoRechazo,
    appUrl: urlApp("/formulario/etapa-productiva/evaluaciones"),
  });
  const transporter = await getTransporter();
  const info = await transporter.sendMail({ from, to: params.aprendizEmail, ...correo });
  if (usingTestAccount) {
    console.log(`[mailer] Vista previa (Ethereal) del rechazo extraordinario: ${nodemailer.getTestMessageUrl(info)}`);
  }
  return { info };
}
