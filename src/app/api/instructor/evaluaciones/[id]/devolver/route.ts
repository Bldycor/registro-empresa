import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { momentoAnteriorEvaluado } from "@/lib/orden-momentos";
import { sendDevolucionMomentoEmail } from "@/lib/mailer";

// El instructor devuelve un Momento 2 o 3 completo (decisión de Coordinación, 9 oct 2026): no
// corresponde al momento que tocaba —por ejemplo, el aprendiz hizo el Momento 3 sin tener evaluado
// el 2— o no se puede evaluar. Queda «devuelto» (RECHAZADA) con el motivo, se borra la rúbrica que
// se hubiera marcado, la franja del instructor se libera, y el aprendiz recibe el aviso por correo
// y en su panel (insignia roja en Evaluaciones y el motivo en el momento). Para retomarlo, el
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
      user: {
        select: {
          nombres: true,
          apellidos: true,
          email: true,
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

  await prisma.$transaction([
    prisma.evaluacion.update({
      where: { id },
      data: { estado: "RECHAZADA", observaciones: parsed.data.motivo, avaladoPorId: user.id, fechaAval: new Date() },
    }),
    // La rúbrica de un momento que no corresponde no cuenta en ningún informe.
    prisma.evaluacionVariable.updateMany({ where: { evaluacionId: id }, data: { valoracion: null, observaciones: null } }),
  ]);

  const numero = evaluacion.numero as 2 | 3;
  const anterior = await momentoAnteriorEvaluado(evaluacion.userId, numero);
  const instructor = evaluacion.user.ficha?.instructor;
  let correoEnviado = true;
  try {
    await sendDevolucionMomentoEmail({
      aprendizEmail: evaluacion.user.email,
      aprendizNombre: `${evaluacion.user.nombres} ${evaluacion.user.apellidos}`,
      instructorEmail: instructor?.email ?? null,
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
