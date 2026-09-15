import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ConcertacionSchema } from "@/lib/validations";
import { rangesOverlap } from "@/lib/time";
import { sendCitacionEmail } from "@/lib/mailer";
import { getVideoConferenceUrl } from "@/lib/video";
import { cambioDeHorario } from "@/lib/citacion-correo";
import { correoCoordinacionCitaciones } from "@/lib/reuniones";
import {
  isGoogleCalendarConfigured,
  createCalendarMeetEvent,
  updateCalendarMeetEvent,
} from "@/lib/google-calendar";

function toDateOnly(fecha: string) {
  return new Date(`${fecha}T00:00:00.000Z`);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const concertacion = await prisma.concertacionFuncion.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({
    concertacion: concertacion
      ? {
          fecha: concertacion.fecha.toISOString().slice(0, 10),
          horaInicio: concertacion.horaInicio,
          horaFin: concertacion.horaFin,
          videollamadaUrl: concertacion.videollamadaUrl,
        }
      : null,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = ConcertacionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { fecha, horaInicio, horaFin } = parsed.data;
  const fechaDate = toDateOnly(fecha);

  const [citasDelDia, existing, user, companyProfile] = await Promise.all([
    prisma.concertacionFuncion.findMany({
      where: { fecha: fechaDate, userId: { not: session.user.id } },
    }),
    prisma.concertacionFuncion.findUnique({ where: { userId: session.user.id } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: { ficha: { select: { instructor: { select: { email: true } } } } },
    }),
    prisma.companyProfile.findUnique({ where: { userId: session.user.id } }),
  ]);

  const hayConflicto = citasDelDia.some((cita) =>
    rangesOverlap(horaInicio, horaFin, cita.horaInicio, cita.horaFin)
  );

  if (hayConflicto) {
    return NextResponse.json(
      {
        error: {
          horaInicio: [
            "Ya existe una cita de otro aprendiz que se cruza con esa fecha y franja horaria.",
          ],
        },
      },
      { status: 409 }
    );
  }

  if (existing?.estado === "APROBADA") {
    return NextResponse.json(
      { error: "Tu instructor ya finalizó la valoración de este momento — no se puede reagendar." },
      { status: 409 }
    );
  }
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }
  if (!companyProfile) {
    return NextResponse.json(
      { error: "Debes completar primero la información de la empresa." },
      { status: 409 }
    );
  }

  // Horario que tenía antes, para avisar el cambio si se está reprogramando (requisito §3.2).
  const anterior = existing
    ? {
        fecha: existing.fecha.toISOString().slice(0, 10),
        horaInicio: existing.horaInicio,
        horaFin: existing.horaFin,
      }
    : null;

  const concertacion = await prisma.concertacionFuncion.upsert({
    where: { userId: session.user.id },
    update: { fecha: fechaDate, horaInicio, horaFin },
    create: { userId: session.user.id, fecha: fechaDate, horaInicio, horaFin },
  });

  const aprendizNombre = `${user.nombres} ${user.apellidos}`;
  const coordinadorEmail = correoCoordinacionCitaciones();
  // El instructor de la ficha valora el Momento 1, así que también recibe la citación y sus
  // reprogramaciones, igual que en los Momentos 2 y 3 (decisión de Coordinación, 14 sep 2026).
  const instructorEmail = user.ficha?.instructor?.email ?? null;
  const attendees = Array.from(
    new Set(
      [coordinadorEmail, instructorEmail, user.email, companyProfile.correoCoformador].filter(
        (e): e is string => Boolean(e),
      ),
    ),
  );

  let videollamadaUrl: string | null = null;
  // Si Google falla al reprogramar se conserva el id del evento que ya existía: perderlo haría que
  // la siguiente vez se creara un evento nuevo y el viejo quedara huérfano en el calendario.
  let googleEventId: string | null = existing?.googleEventId ?? null;

  // Mismo criterio que en los Momentos 2 y 3: Google Calendar solo resuelve el enlace de Meet. Si
  // falla (token vencido, API caída), la reunión ya quedó guardada y no debe perderse: se cae al
  // enlace Jitsi de respaldo en vez de tumbar la petición. Antes, aquí un fallo de Google
  // devolvía error 500 aunque la reunión ya estuviera guardada.
  if (isGoogleCalendarConfigured()) {
    const eventInput = {
      summary: `Concertación de funciones - ${aprendizNombre}`,
      description: `Videollamada de concertación de funciones (etapa productiva) del aprendiz ${aprendizNombre}.`,
      fecha,
      horaInicio,
      horaFin,
      attendees,
    };
    try {
      const result = existing?.googleEventId
        ? await updateCalendarMeetEvent({ ...eventInput, eventId: existing.googleEventId })
        : await createCalendarMeetEvent(eventInput);
      videollamadaUrl = result.meetLink ?? result.eventLink ?? null;
      googleEventId = result.eventId;
    } catch (err) {
      console.error("[concertacion] No se pudo crear/actualizar el evento de Google Calendar:", err);
    }
  }
  if (!videollamadaUrl) {
    videollamadaUrl = getVideoConferenceUrl(concertacion.id);
  }

  // Correo propio de la institución, siempre. Antes, con Google Calendar configurado (el caso de
  // producción) la Concertación no enviaba correo propio: dependía solo de la invitación de
  // Google. Al reprogramar, el correo lo dice y muestra el horario anterior y el nuevo.
  try {
    await sendCitacionEmail({
      reunionId: concertacion.id,
      aprendizNombre,
      destinatarios: attendees,
      fecha,
      horaInicio,
      horaFin,
      videollamadaUrl,
      anterior: cambioDeHorario(anterior, { fecha, horaInicio, horaFin }),
    });
  } catch (err) {
    console.error("[concertacion] No se pudo enviar el correo de citación:", err);
  }

  const actualizada = await prisma.concertacionFuncion.update({
    where: { userId: session.user.id },
    data: { videollamadaUrl, googleEventId },
  });

  return NextResponse.json(
    {
      concertacion: {
        fecha: actualizada.fecha.toISOString().slice(0, 10),
        horaInicio: actualizada.horaInicio,
        horaFin: actualizada.horaFin,
        videollamadaUrl: actualizada.videollamadaUrl,
      },
    },
    { status: 200 }
  );
}
