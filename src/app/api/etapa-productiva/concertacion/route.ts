import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ConcertacionSchema } from "@/lib/validations";
import { rangesOverlap } from "@/lib/time";
import { sendCitacionEmail } from "@/lib/mailer";
import { getVideoConferenceUrl } from "@/lib/video";
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
    prisma.user.findUnique({ where: { id: session.user.id } }),
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

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }
  if (!companyProfile) {
    return NextResponse.json(
      { error: "Debes completar primero la información de la empresa." },
      { status: 409 }
    );
  }

  const concertacion = await prisma.concertacionFuncion.upsert({
    where: { userId: session.user.id },
    update: { fecha: fechaDate, horaInicio, horaFin },
    create: { userId: session.user.id, fecha: fechaDate, horaInicio, horaFin },
  });

  const aprendizNombre = `${user.nombres} ${user.apellidos}`;
  const coordinadorEmail = process.env.CITACION_EMAIL || "bcoba@sena.edu.co";
  const attendees = Array.from(
    new Set([coordinadorEmail, user.email, companyProfile.correoCoformador].filter(Boolean))
  );

  let videollamadaUrl: string;
  let googleEventId: string | null = null;

  if (isGoogleCalendarConfigured()) {
    const eventInput = {
      summary: `Concertación de funciones - ${aprendizNombre}`,
      description: `Videollamada de concertación de funciones (etapa productiva) del aprendiz ${aprendizNombre}.`,
      fecha,
      horaInicio,
      horaFin,
      attendees,
    };

    const result = existing?.googleEventId
      ? await updateCalendarMeetEvent({ ...eventInput, eventId: existing.googleEventId })
      : await createCalendarMeetEvent(eventInput);

    videollamadaUrl = result.meetLink ?? result.eventLink ?? getVideoConferenceUrl(concertacion.id);
    googleEventId = result.eventId;
  } else {
    const result = await sendCitacionEmail({
      concertacionId: concertacion.id,
      aprendizNombre,
      aprendizEmail: user.email,
      coformadorEmail: companyProfile.correoCoformador,
      fecha,
      horaInicio,
      horaFin,
    });
    videollamadaUrl = result.videollamadaUrl;
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
