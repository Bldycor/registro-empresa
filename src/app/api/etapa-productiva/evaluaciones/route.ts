import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { EvaluacionAgendaSchema } from "@/lib/validations";
import { TODAS_LAS_VARIABLES, variableCategoria } from "@/lib/evaluacion-variables";
import { rangesOverlap } from "@/lib/time";
import { sendCitacionEmail } from "@/lib/mailer";
import { getVideoConferenceUrl } from "@/lib/video";
import { cambioDeHorario } from "@/lib/citacion-correo";
import {
  isGoogleCalendarConfigured,
  createCalendarMeetEvent,
  updateCalendarMeetEvent,
} from "@/lib/google-calendar";

const EVALUACION_SELECT = {
  id: true,
  numero: true,
  fecha: true,
  horaInicio: true,
  horaFin: true,
  modalidad: true,
  videollamadaUrl: true,
  juicioFinal: true,
  retroalimentacionCoformador: true,
  retroalimentacionInstructor: true,
  retroalimentacionAprendiz: true,
  estado: true,
  observaciones: true,
  fechaAval: true,
  variables: {
    select: { variable: true, categoria: true, valoracion: true, observaciones: true },
  },
} as const;

function toDateOnly(fecha: string) {
  return new Date(`${fecha}T00:00:00.000Z`);
}

// Momentos 2 (seguimiento) y 3 (cierre) del propio aprendiz — la Concertación (Momento 1) sigue
// viviendo en /api/etapa-productiva/concertacion, sin cambios.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const [evaluaciones, aprendiz] = await Promise.all([
    prisma.evaluacion.findMany({
      where: { userId: session.user.id, numero: { in: [2, 3] }, esExtraordinario: false },
      select: EVALUACION_SELECT,
      orderBy: { numero: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { ficha: { select: { instructor: { select: { nombres: true, apellidos: true } } } } },
    }),
  ]);

  return NextResponse.json({
    evaluaciones,
    instructor: aprendiz?.ficha?.instructor ?? null,
  });
}

// Agenda (o reagenda) la reunión de Momento 2 o 3. Solo se puede reagendar mientras el instructor
// no haya finalizado la evaluación (estado APROBADA la deja fija).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = EvaluacionAgendaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  const [user, existing] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        nombres: true,
        apellidos: true,
        email: true,
        ficha: { select: { instructorId: true, instructor: { select: { email: true } } } },
        companyProfile: { select: { correoCoformador: true } },
      },
    }),
    prisma.evaluacion.findFirst({
      where: { userId: session.user.id, numero: d.numero, esExtraordinario: false },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }
  const instructorId = user.ficha?.instructorId;
  const instructorEmail = user.ficha?.instructor?.email;
  if (!instructorId || !instructorEmail) {
    return NextResponse.json(
      { error: "Tu ficha todavía no tiene un instructor asignado." },
      { status: 409 }
    );
  }
  if (existing?.estado === "APROBADA") {
    return NextResponse.json(
      { error: "Esta evaluación ya fue finalizada por tu instructor — no se puede reagendar." },
      { status: 409 }
    );
  }

  const fechaDate = toDateOnly(d.fecha);

  // Horario que tenía antes, para avisar el cambio si se está reprogramando (requisito §3.2).
  const anterior =
    existing?.fecha && existing.horaInicio && existing.horaFin
      ? {
          fecha: existing.fecha.toISOString().slice(0, 10),
          horaInicio: existing.horaInicio,
          horaFin: existing.horaFin,
        }
      : null;

  const reunionesDelDia = await prisma.evaluacion.findMany({
    where: {
      fecha: fechaDate,
      userId: { not: session.user.id },
      user: { ficha: { instructorId } },
    },
    select: { horaInicio: true, horaFin: true },
  });
  const hayConflicto = reunionesDelDia.some(
    (r) => r.horaInicio && r.horaFin && rangesOverlap(d.horaInicio, d.horaFin, r.horaInicio, r.horaFin)
  );
  if (hayConflicto) {
    return NextResponse.json(
      {
        error: {
          horaInicio: [
            "Tu instructor ya tiene otra reunión de evaluación que se cruza con esa fecha y franja horaria.",
          ],
        },
      },
      { status: 409 }
    );
  }

  const evaluacion = existing
    ? await prisma.evaluacion.update({
        where: { id: existing.id },
        data: { fecha: fechaDate, horaInicio: d.horaInicio, horaFin: d.horaFin, modalidad: d.modalidad },
      })
    : await prisma.evaluacion.create({
        data: {
          userId: session.user.id,
          numero: d.numero,
          fecha: fechaDate,
          horaInicio: d.horaInicio,
          horaFin: d.horaFin,
          modalidad: d.modalidad,
          variables: {
            create: TODAS_LAS_VARIABLES.map((variable) => ({
              variable,
              categoria: variableCategoria[variable],
            })),
          },
        },
      });

  const aprendizNombre = `${user.nombres} ${user.apellidos}`;
  const titulo = d.numero === 2 ? "Evaluación de seguimiento (Momento 2)" : "Evaluación de cierre (Momento 3)";
  const destinatarios = [instructorEmail, user.email, user.companyProfile?.correoCoformador].filter(
    (v): v is string => Boolean(v)
  );

  let videollamadaUrl: string | null = null;
  // Si Google falla al reprogramar se conserva el id del evento que ya existía: antes se
  // sobrescribía con null, y la siguiente vez se creaba un evento nuevo dejando el viejo huérfano.
  let googleEventId: string | null = existing?.googleEventId ?? null;

  // El evento de Google Calendar (si está configurado) solo resuelve el enlace de Meet — ya no es
  // el único canal de notificación: si falla (token expirado, API caída), la reunión ya quedó
  // guardada arriba y no debe perderse por un problema de Calendar, así que se degrada al enlace
  // Jitsi de respaldo en vez de tumbar la petición.
  if (isGoogleCalendarConfigured()) {
    const eventInput = {
      summary: `${titulo} - ${aprendizNombre}`,
      description: `Videollamada de ${titulo.toLowerCase()} (etapa productiva) del aprendiz ${aprendizNombre}.`,
      fecha: d.fecha,
      horaInicio: d.horaInicio,
      horaFin: d.horaFin,
      attendees: destinatarios,
    };
    try {
      const result = existing?.googleEventId
        ? await updateCalendarMeetEvent({ ...eventInput, eventId: existing.googleEventId })
        : await createCalendarMeetEvent(eventInput);
      videollamadaUrl = result.meetLink ?? result.eventLink ?? null;
      googleEventId = result.eventId;
    } catch (err) {
      console.error("[evaluaciones] No se pudo crear/actualizar el evento de Google Calendar:", err);
    }
  }
  if (!videollamadaUrl) {
    videollamadaUrl = getVideoConferenceUrl(evaluacion.id, "Evaluacion");
  }

  // Correo propio de la institución con el enlace real ya resuelto — se envía siempre, tanto si
  // hubo evento de Google Calendar como si no, para no depender de que la invitación de Calendar
  // (ajena a nuestro control) llegue a los destinatarios.
  try {
    await sendCitacionEmail({
      reunionId: evaluacion.id,
      titulo,
      prefijoSala: "Evaluacion",
      aprendizNombre,
      destinatarios,
      fecha: d.fecha,
      horaInicio: d.horaInicio,
      horaFin: d.horaFin,
      videollamadaUrl,
      anterior: cambioDeHorario(anterior, {
        fecha: d.fecha,
        horaInicio: d.horaInicio,
        horaFin: d.horaFin,
      }),
    });
  } catch (err) {
    console.error("[evaluaciones] No se pudo enviar el correo de citación:", err);
  }

  const actualizada = await prisma.evaluacion.update({
    where: { id: evaluacion.id },
    data: { videollamadaUrl, googleEventId, estado: "PENDIENTE" },
    select: EVALUACION_SELECT,
  });

  return NextResponse.json({ evaluacion: actualizada }, { status: 200 });
}
