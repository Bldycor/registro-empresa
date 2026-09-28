import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { PlanMejoramientoDecisionSchema } from "@/lib/validations";
import { calcularFechaLimite } from "@/lib/plan-mejoramiento";
import { sendPlanMejoramientoEmail } from "@/lib/mailer";

// Decisión del coordinador académico sobre un plan que redactó el instructor (Acuerdo 009: el
// plan lo firman el aprendiz y el coordinador). Autorizarlo equivale a suscribirlo: ahí se fija
// la fecha límite —los días que puso el instructor, recortados si la etapa productiva termina
// antes— y sale la comunicación escrita al aprendiz. Devolverlo lo regresa al instructor con la
// observación, sin plazo corriendo.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const { id } = await params;
  const parsed = PlanMejoramientoDecisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;
  const observaciones = d.observacionesCoordinacion?.trim() || null;

  if (d.decision === "DEVOLVER" && !observaciones) {
    return NextResponse.json(
      { error: { observacionesCoordinacion: ["Escribe por qué lo devuelves: el instructor necesita saber qué corregir."] } },
      { status: 400 },
    );
  }

  const existente = await prisma.planMejoramiento.findUnique({
    where: { id },
    select: {
      estado: true,
      diasPlazo: true,
      momento: true,
      resultadosNoSuperados: true,
      actividades: true,
      evidencias: true,
      user: {
        select: {
          nombres: true,
          apellidos: true,
          email: true,
          fechaFinEtapaProductiva: true,
          ficha: { select: { instructor: { select: { email: true } } } },
        },
      },
    },
  });
  if (!existente) {
    return NextResponse.json({ error: "Plan de mejoramiento no encontrado." }, { status: 404 });
  }
  if (existente.estado !== "POR_AUTORIZAR") {
    return NextResponse.json(
      { error: { _root: ["Este plan ya fue resuelto."] } },
      { status: 409 },
    );
  }

  if (d.decision === "DEVOLVER") {
    await prisma.planMejoramiento.update({
      where: { id },
      data: { estado: "DEVUELTO", observacionesCoordinacion: observaciones },
    });
    return NextResponse.json({ plan: { id, estado: "DEVUELTO" } });
  }

  const autorizadoEn = new Date();
  const { fechaLimite, recortadaPorFinEP } = calcularFechaLimite({
    autorizadoEn,
    diasPlazo: existente.diasPlazo,
    finEtapaProductiva: existente.user.fechaFinEtapaProductiva,
  });

  await prisma.planMejoramiento.update({
    where: { id },
    data: {
      estado: "VIGENTE",
      autorizadoPorId: user.id,
      fechaAutorizacion: autorizadoEn,
      fechaLimite,
      observacionesCoordinacion: observaciones,
    },
  });

  // El correo es la comunicación escrita, pero si el envío falla la autorización ya está dada:
  // no se revierte, y el plan se ve igual en la plataforma.
  let correoEnviado = true;
  try {
    const coordinador = await prisma.user.findUnique({
      where: { id: user.id },
      select: { nombres: true, apellidos: true },
    });
    await sendPlanMejoramientoEmail({
      aprendizEmail: existente.user.email,
      aprendizNombre: `${existente.user.nombres} ${existente.user.apellidos}`,
      instructorEmail: existente.user.ficha?.instructor?.email ?? null,
      momento: existente.momento,
      resultadosNoSuperados: existente.resultadosNoSuperados,
      actividades: existente.actividades,
      evidencias: existente.evidencias,
      fechaLimite,
      diasPlazo: existente.diasPlazo,
      autorizadoPor: coordinador ? `${coordinador.nombres} ${coordinador.apellidos}` : "Coordinación",
      observacionesCoordinacion: observaciones,
    });
  } catch (error) {
    correoEnviado = false;
    console.error("[plan-mejoramiento] No se pudo enviar la comunicación al aprendiz:", error);
  }

  return NextResponse.json({
    plan: { id, estado: "VIGENTE", fechaLimite },
    correoEnviado,
    recortadaPorFinEP,
  });
}
