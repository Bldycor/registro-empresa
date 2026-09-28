import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { PlanMejoramientoAccionSchema } from "@/lib/validations";

// Dos cosas hace el instructor sobre un plan ya redactado:
//
// - CERRAR: «la verificación de este plan será responsabilidad del instructor o equipo ejecutor»
//   (Acuerdo 009). Cumplido o no cumplido, siempre con la constancia escrita de qué verificó. No
//   cumplido NO es causal de deserción: después puede abrir un segundo plan si el caso lo amerita.
// - CORREGIR: si Coordinación lo devolvió, lo reescribe y lo manda otra vez a autorización.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const { id } = await params;
  const parsed = PlanMejoramientoAccionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  const existente = await prisma.planMejoramiento.findUnique({
    where: { id },
    select: { estado: true, user: { select: { ficha: { select: { instructorId: true } } } } },
  });
  if (!existente) {
    return NextResponse.json({ error: "Plan de mejoramiento no encontrado." }, { status: 404 });
  }
  if (existente.user.ficha?.instructorId !== user.id) {
    return NextResponse.json(
      { error: "Solo puedes trabajar planes de aprendices de tus fichas." },
      { status: 403 },
    );
  }

  if (d.accion === "CORREGIR") {
    if (existente.estado !== "DEVUELTO") {
      return NextResponse.json(
        { error: { _root: ["Solo se corrige un plan que Coordinación devolvió."] } },
        { status: 409 },
      );
    }
    const plan = await prisma.planMejoramiento.update({
      where: { id },
      data: {
        momento: d.momento,
        resultadosNoSuperados: d.resultadosNoSuperados,
        actividades: d.actividades,
        evidencias: d.evidencias,
        llamadosPrevios: d.llamadosPrevios,
        diasPlazo: d.diasPlazo,
        estado: "POR_AUTORIZAR",
        // La observación con la que lo devolvieron ya cumplió su función; el plan vuelve limpio.
        observacionesCoordinacion: null,
      },
      select: { id: true, estado: true },
    });
    return NextResponse.json({ plan });
  }

  if (existente.estado !== "VIGENTE") {
    return NextResponse.json(
      { error: { _root: ["Solo se cierra un plan vigente, ya autorizado por Coordinación."] } },
      { status: 409 },
    );
  }

  const plan = await prisma.planMejoramiento.update({
    where: { id },
    data: {
      estado: d.resultado,
      verificacion: d.verificacion,
      soporteUrl: d.soporteUrl || null,
      cerradoPorId: user.id,
      fechaCierre: new Date(),
    },
    select: { id: true, estado: true },
  });

  return NextResponse.json({ plan });
}
