import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { ReprogramarReunionSchema } from "@/lib/validations";
import { fechaEnColombia } from "@/lib/plazos-institucionales";
import { rangesOverlap } from "@/lib/time";
import { getVideoConferenceUrl } from "@/lib/video";
import { cambioDeHorario } from "@/lib/citacion-correo";
import { sendCitacionEmail } from "@/lib/mailer";
import {
  isGoogleCalendarConfigured,
  createCalendarMeetEvent,
  updateCalendarMeetEvent,
} from "@/lib/google-calendar";
import {
  destinatariosReunion,
  franjasOcupadasInstructor,
  prefijoSalaReunion,
  tituloReunion,
  type TipoReunion,
} from "@/lib/reuniones";

const APRENDIZ_SELECT = {
  nombres: true,
  apellidos: true,
  email: true,
  ficha: { select: { instructorId: true, instructor: { select: { email: true } } } },
  companyProfile: { select: { correoCoformador: true } },
} as const;

const REUNION_SELECT = {
  id: true,
  fecha: true,
  horaInicio: true,
  horaFin: true,
  estado: true,
  videollamadaUrl: true,
  googleEventId: true,
  user: { select: APRENDIZ_SELECT },
} as const;

// La reunión en una forma común, viva en la tabla que viva.
async function cargarReunion(tipo: TipoReunion, id: string) {
  if (tipo === "CONCERTACION") {
    const c = await prisma.concertacionFuncion.findUnique({ where: { id }, select: REUNION_SELECT });
    return c ? { ...c, numero: 1, esExtraordinario: false, motivoExtraordinario: null as string | null } : null;
  }
  return prisma.evaluacion.findUnique({
    where: { id },
    select: { ...REUNION_SELECT, numero: true, esExtraordinario: true, motivoExtraordinario: true },
  });
}

function error(status: number, campo: string, mensaje: string) {
  return NextResponse.json({ error: { [campo]: [mensaje] } }, { status });
}

// El instructor reprograma una reunión de sus aprendices (requisito §3.2: la reprogramación la
// puede hacer cualquiera de las partes). Sirve para la Concertación, los Momentos 2 y 3 y las
// reuniones extraordinarias ya aprobadas.
//
// A todas las partes les llega el correo de «Reunión reprogramada», con el horario anterior, el
// nuevo, quién la movió y, si lo escribió, el motivo del cambio. La invitación de calendario
// actualiza el evento que ya tenían, y el enlace de la videollamada se conserva.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const { id } = await params;
  const parsed = ReprogramarReunionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  const reunion = await cargarReunion(d.tipo, id);
  if (!reunion) return error(404, "_root", "Reunión no encontrada.");
  if (reunion.user.ficha?.instructorId !== user.id) {
    return error(403, "_root", "Solo puedes reprogramar reuniones de aprendices de tus fichas.");
  }
  if (reunion.esExtraordinario && reunion.estado !== "APROBADA") {
    return error(
      409,
      "_root",
      "Una reunión extraordinaria se reprograma una vez aprobada. Mientras esté por aprobar, apruébala o recházala con una nota.",
    );
  }
  if (!reunion.esExtraordinario && reunion.estado === "APROBADA") {
    return error(409, "_root", "Ya finalizaste la valoración de este Momento: la reunión no se puede reprogramar.");
  }
  if (d.fecha < fechaEnColombia(new Date())) {
    return error(400, "fecha", "La fecha no puede ser en el pasado.");
  }

  const nuevo = { fecha: d.fecha, horaInicio: d.horaInicio, horaFin: d.horaFin };
  const anterior =
    reunion.fecha && reunion.horaInicio && reunion.horaFin
      ? { fecha: reunion.fecha.toISOString().slice(0, 10), horaInicio: reunion.horaInicio, horaFin: reunion.horaFin }
      : null;
  const cambio = cambioDeHorario(anterior, nuevo);
  if (anterior && !cambio) {
    return error(400, "horaInicio", "La reunión ya está en ese horario: elige otra fecha u hora.");
  }

  const fechaDate = new Date(`${d.fecha}T00:00:00.000Z`);
  const ocupadas = await franjasOcupadasInstructor({
    instructorId: user.id,
    fecha: fechaDate,
    tipo: d.tipo,
    excluirId: id,
  });
  if (ocupadas.some((o) => rangesOverlap(d.horaInicio, d.horaFin, o.horaInicio, o.horaFin))) {
    return error(
      409,
      "horaInicio",
      d.tipo === "CONCERTACION"
        ? "Esa franja se cruza con otra reunión tuya o con otra concertación que acompaña Coordinación."
        : "Ya tienes otra reunión que se cruza con esa franja.",
    );
  }

  const titulo = tituloReunion(d.tipo, reunion.numero, reunion.esExtraordinario);
  const prefijoSala = prefijoSalaReunion(d.tipo, reunion.esExtraordinario);
  const aprendizNombre = `${reunion.user.nombres} ${reunion.user.apellidos}`;
  const destinatarios = destinatariosReunion({
    tipo: d.tipo,
    aprendizEmail: reunion.user.email,
    instructorEmail: reunion.user.ficha?.instructor?.email,
    coformadorEmail: reunion.user.companyProfile?.correoCoformador,
  });

  // Mismo criterio que en las rutas de agenda: Google Calendar solo resuelve el enlace de Meet, y
  // si falla la reprogramación sigue adelante. Aquí, además, se conserva el enlace que ya tenían
  // todos en vez de cambiarlo por uno de respaldo.
  let meetLink: string | null = null;
  let googleEventId = reunion.googleEventId;
  if (isGoogleCalendarConfigured()) {
    const evento = {
      summary: `${titulo} - ${aprendizNombre}`,
      description: `Videollamada de ${titulo.toLowerCase()} (etapa productiva) del aprendiz ${aprendizNombre}.`,
      ...nuevo,
      attendees: destinatarios,
    };
    try {
      const r = reunion.googleEventId
        ? await updateCalendarMeetEvent({ ...evento, eventId: reunion.googleEventId })
        : await createCalendarMeetEvent(evento);
      meetLink = r.meetLink ?? r.eventLink ?? null;
      googleEventId = r.eventId ?? googleEventId;
    } catch (err) {
      console.error("[reuniones] No se pudo actualizar el evento de Google Calendar:", err);
    }
  }
  const videollamadaUrl = meetLink ?? reunion.videollamadaUrl ?? getVideoConferenceUrl(id, prefijoSala);

  const cambios = {
    fecha: fechaDate,
    horaInicio: d.horaInicio,
    horaFin: d.horaFin,
    videollamadaUrl,
    googleEventId,
  };
  if (d.tipo === "CONCERTACION") {
    await prisma.concertacionFuncion.update({ where: { id }, data: cambios });
  } else {
    await prisma.evaluacion.update({ where: { id }, data: cambios });
  }

  try {
    await sendCitacionEmail({
      reunionId: id,
      titulo,
      prefijoSala,
      aprendizNombre,
      destinatarios,
      ...nuevo,
      videollamadaUrl,
      anterior: cambio,
      detalle: reunion.motivoExtraordinario,
      reprogramadaPor: `${user.nombres} ${user.apellidos} (instructor)`,
      motivoCambio: d.motivo?.trim() || null,
    });
  } catch (err) {
    console.error("[reuniones] No se pudo enviar el aviso de reprogramación:", err);
  }

  return NextResponse.json({ reunion: { id, ...nuevo, videollamadaUrl } });
}
