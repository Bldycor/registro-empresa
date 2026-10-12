import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { momentoAnteriorEvaluado } from "@/lib/orden-momentos";
import { sendDevolucionMomentoEmail } from "@/lib/mailer";
import { HORARIO_LIBERADO } from "@/lib/momentos";
import { cancelCalendarMeetEvent, isGoogleCalendarConfigured } from "@/lib/google-calendar";
import { destinatariosReunion, reunionYaEmpezo } from "@/lib/reuniones";

// El instructor devuelve un Momento 2 o 3 completo (decisión de Coordinación, 9 oct 2026): no
// corresponde al momento que tocaba —por ejemplo, el aprendiz hizo el Momento 3 sin tener evaluado
// el 2— o no se puede evaluar. Queda «devuelto» (RECHAZADA) con el motivo, se borra la rúbrica que
// se hubiera marcado y, si la reunión todavía no empezó, se cancela (horario, videollamada y evento
// de Google; una que ya pasó conserva su fecha como constancia). El aprendiz recibe el aviso por
// correo —con copia a los citados a la reunión— y en su panel (insignia roja en Evaluaciones y el motivo en el momento). Para retomarlo, el
// aprendiz lo vuelve a agendar o reenvía su formato, siempre que el anterior ya esté evaluado.
const DevolverSchema = z.object({
  motivo: z.string().trim().min(10, "Escribe el motivo (al menos 10 caracteres): el aprendiz lo recibe por correo."),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;
  const { id } = await params;

  const parsed = DevolverSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });

  const evaluacion = await prisma.evaluacion.findUnique({
    where: { id },
    select: {
      id: true,
      numero: true,
      estado: true,
      esExtraordinario: true,
      userId: true,
      fecha: true,
      horaInicio: true,
      googleEventId: true,
      user: {
        select: {
          nombres: true,
          apellidos: true,
          email: true,
          companyProfile: { select: { correoCoformador: true } },
          ficha: { select: { instructorId: true, instructor: { select: { nombres: true, apellidos: true, email: true } } } },
        },
      },
    },
  });
  if (!evaluacion) return NextResponse.json({ error: "Evaluación no encontrada." }, { status: 404 });
  if (evaluacion.user.ficha?.instructorId !== user.id) {
    return NextResponse.json({ error: "Solo puedes devolver momentos de aprendices de tus fichas." }, { status: 403 });
  }
  if (evaluacion.esExtraordinario || (evaluacion.numero !== 2 && evaluacion.numero !== 3)) {
    return NextResponse.json({ error: "Solo se devuelven los Momentos 2 y 3." }, { status: 400 });
  }
  if (evaluacion.estado === "APROBADA") {
    return NextResponse.json({ error: "Este momento ya está evaluado: no se puede devolver." }, { status: 409 });
  }
  if (evaluacion.estado === "RECHAZADA") {
    return NextResponse.json({ error: "Este momento ya fue devuelto." }, { status: 409 });
  }

  // Solo se cancela una reunión que todavía no empezó; una que ya pasó queda como constancia.
  const cancelarReunion = evaluacion.fecha !== null && !reunionYaEmpezo(evaluacion, new Date());

  // La condición sobre el estado va en la misma escritura: si el instructor lo finalizó en otra
  // pestaña entre la consulta y este punto, no se devuelve.
  const devuelto = await prisma.$transaction(async (tx) => {
    const { count } = await tx.evaluacion.updateMany({
      where: { id, estado: "PENDIENTE" },
      data: {
        estado: "RECHAZADA",
        observaciones: parsed.data.motivo,
        avaladoPorId: user.id,
        fechaAval: new Date(),
        ...(cancelarReunion ? HORARIO_LIBERADO : {}),
      },
    });
    if (count === 0) return false;
    // La rúbrica de un momento que no corresponde no cuenta en ningún informe.
    await tx.evaluacionVariable.updateMany({ where: { evaluacionId: id }, data: { valoracion: null, observaciones: null } });
    return true;
  });
  if (!devuelto) {
    return NextResponse.json({ error: "Este momento cambió mientras tanto: recarga la página." }, { status: 409 });
  }

  const numero = evaluacion.numero as 2 | 3;
  const instructor = evaluacion.user.ficha?.instructor;
  // Cancelar el evento y revisar el momento anterior no dependen uno del otro.
  const [, anterior] = await Promise.all([
    cancelarReunion && evaluacion.googleEventId && isGoogleCalendarConfigured()
      ? cancelCalendarMeetEvent(evaluacion.googleEventId)
          .then(() => prisma.evaluacion.update({ where: { id }, data: { googleEventId: null } }))
          .catch((error) =>
            console.error("[instructor/evaluaciones/devolver] No se pudo cancelar el evento de Google Calendar:", error),
          )
      : null,
    momentoAnteriorEvaluado(evaluacion.userId, numero),
  ]);

  let correoEnviado = true;
  try {
    // Los mismos citados a la reunión del momento (`destinatariosReunion`), con el aprendiz como
    // destinatario principal.
    const citados = destinatariosReunion({
      tipo: "EVALUACION",
      aprendizEmail: evaluacion.user.email,
      instructorEmail: instructor?.email,
      coformadorEmail: evaluacion.user.companyProfile?.correoCoformador,
    });
    await sendDevolucionMomentoEmail({
      aprendizEmail: evaluacion.user.email,
      copias: citados.filter((c) => c.toLowerCase() !== evaluacion.user.email.trim().toLowerCase()),
      aprendizNombre: `${evaluacion.user.nombres} ${evaluacion.user.apellidos}`,
      reunionCancelada: cancelarReunion,
      instructorNombre: instructor ? `${instructor.nombres} ${instructor.apellidos}` : "Tu instructor",
      numero,
      motivo: parsed.data.motivo,
      anteriorPendiente: !anterior.ok,
    });
  } catch (error) {
    correoEnviado = false;
    console.error("[instructor/evaluaciones/devolver] No se pudo enviar el correo:", error);
  }

  return NextResponse.json({ ok: true, correoEnviado });
}
