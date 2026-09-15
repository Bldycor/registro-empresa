import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { DecisionExtraordinariaSchema } from "@/lib/validations";
import { fechaEnColombia } from "@/lib/plazos-institucionales";
import { getVideoConferenceUrl } from "@/lib/video";
import { isGoogleCalendarConfigured, createCalendarMeetEvent } from "@/lib/google-calendar";
import { sendCitacionEmail, sendRechazoExtraordinariaEmail } from "@/lib/mailer";

const TITULO = "Reunión extraordinaria";

const RESPUESTA_SELECT = {
  id: true,
  estado: true,
  observaciones: true,
  videollamadaUrl: true,
  fechaAval: true,
} as const;

// El instructor aprueba o rechaza una reunión extraordinaria que propuso el aprendiz.
//
// - Al aprobarla sale la citación a todas las partes —instructor, aprendiz y coformador— con el
//   enlace de la videollamada y la invitación de calendario. Es el único momento en que el
//   coformador se entera: así no recibe invitaciones a reuniones que después no se hacen.
// - Al rechazarla, el aprendiz recibe la razón y la franja queda libre (ver `ocupaFranja`).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const { id } = await params;
  const existing = await prisma.evaluacion.findUnique({
    where: { id },
    select: {
      id: true,
      esExtraordinario: true,
      estado: true,
      fecha: true,
      horaInicio: true,
      horaFin: true,
      motivoExtraordinario: true,
      user: {
        select: {
          nombres: true,
          apellidos: true,
          email: true,
          ficha: { select: { instructorId: true, instructor: { select: { email: true } } } },
          companyProfile: { select: { correoCoformador: true } },
        },
      },
    },
  });
  if (!existing || !existing.esExtraordinario) {
    return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }
  if (existing.user.ficha?.instructorId !== user.id) {
    return NextResponse.json(
      { error: "Solo puedes responder solicitudes de aprendices de tus fichas." },
      { status: 403 },
    );
  }
  if (existing.estado !== "PENDIENTE") {
    return NextResponse.json({ error: "Esta solicitud ya fue respondida." }, { status: 409 });
  }
  if (!existing.fecha || !existing.horaInicio || !existing.horaFin) {
    return NextResponse.json({ error: "La solicitud no tiene fecha u hora." }, { status: 409 });
  }

  const body = await request.json();
  const parsed = DecisionExtraordinariaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;
  const observaciones = d.observaciones?.trim() || null;

  const horario = {
    fecha: existing.fecha.toISOString().slice(0, 10),
    horaInicio: existing.horaInicio,
    horaFin: existing.horaFin,
  };
  const aprendizNombre = `${existing.user.nombres} ${existing.user.apellidos}`;

  if (d.estado === "RECHAZADA") {
    const reunion = await prisma.evaluacion.update({
      where: { id },
      data: { estado: "RECHAZADA", avaladoPorId: user.id, fechaAval: new Date(), observaciones },
      select: RESPUESTA_SELECT,
    });
    try {
      await sendRechazoExtraordinariaEmail({
        aprendizEmail: existing.user.email,
        aprendizNombre,
        horario,
        motivoRechazo: observaciones ?? "",
      });
    } catch (err) {
      console.error("[extraordinarias] No se pudo avisar el rechazo al aprendiz:", err);
    }
    return NextResponse.json({ reunion });
  }

  // Aprobar una fecha que ya pasó dejaría una citación a una reunión imposible: mejor rechazarla
  // con una nota, para que el aprendiz proponga otra.
  if (horario.fecha < fechaEnColombia(new Date())) {
    return NextResponse.json(
      {
        error:
          "La fecha propuesta ya pasó. Recházala con una nota para que el aprendiz proponga otra.",
      },
      { status: 409 },
    );
  }

  const destinatarios = [
    existing.user.ficha?.instructor?.email,
    existing.user.email,
    existing.user.companyProfile?.correoCoformador,
  ].filter((e): e is string => Boolean(e));

  // Mismo criterio que en los Momentos: Google Calendar solo resuelve el enlace de Meet; si falla,
  // se cae al enlace de respaldo y la aprobación sigue adelante.
  let videollamadaUrl: string | null = null;
  let googleEventId: string | null = null;
  if (isGoogleCalendarConfigured()) {
    try {
      const r = await createCalendarMeetEvent({
        summary: `${TITULO} - ${aprendizNombre}`,
        description: `Reunión extraordinaria (etapa productiva) del aprendiz ${aprendizNombre}. Motivo: ${existing.motivoExtraordinario ?? ""}`,
        ...horario,
        attendees: destinatarios,
      });
      videollamadaUrl = r.meetLink ?? r.eventLink ?? null;
      googleEventId = r.eventId;
    } catch (err) {
      console.error("[extraordinarias] No se pudo crear el evento de Google Calendar:", err);
    }
  }
  if (!videollamadaUrl) {
    videollamadaUrl = getVideoConferenceUrl(id, "Extraordinaria");
  }

  const reunion = await prisma.evaluacion.update({
    where: { id },
    data: {
      estado: "APROBADA",
      avaladoPorId: user.id,
      fechaAval: new Date(),
      observaciones,
      videollamadaUrl,
      googleEventId,
    },
    select: RESPUESTA_SELECT,
  });

  try {
    await sendCitacionEmail({
      reunionId: id,
      titulo: TITULO,
      prefijoSala: "Extraordinaria",
      aprendizNombre,
      destinatarios,
      ...horario,
      videollamadaUrl,
      detalle: existing.motivoExtraordinario,
    });
  } catch (err) {
    console.error("[extraordinarias] No se pudo enviar la citación:", err);
  }

  return NextResponse.json({ reunion });
}
