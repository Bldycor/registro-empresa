import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { PlanMejoramientoSchema } from "@/lib/validations";
import { cargarPlanes } from "@/lib/plan-mejoramiento";

// Planes de mejoramiento de los aprendices de las fichas del instructor (guía GFPI-G-040 §9.4).
// El instructor es quien los redacta y quien los verifica; quien los autoriza es Coordinación.
export async function GET() {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  return NextResponse.json({ planes: await cargarPlanes({ instructorId: user.id }) });
}

export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const parsed = PlanMejoramientoSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  const aprendiz = await prisma.user.findUnique({
    where: { id: d.userId },
    select: { role: true, ficha: { select: { instructorId: true } } },
  });
  if (!aprendiz || aprendiz.role !== "APRENDIZ") {
    return NextResponse.json({ error: { userId: ["El aprendiz no existe."] } }, { status: 404 });
  }
  if (aprendiz.ficha?.instructorId !== user.id) {
    return NextResponse.json(
      { error: { userId: ["Solo puedes abrir planes de aprendices de tus fichas."] } },
      { status: 403 },
    );
  }

  // Un plan abierto a la vez por aprendiz: mientras no se cierre el anterior no se redacta otro.
  // El segundo plan del que habla el reglamento se abre después de cerrar el primero.
  const abierto = await prisma.planMejoramiento.findFirst({
    where: { userId: d.userId, estado: { in: ["POR_AUTORIZAR", "VIGENTE", "DEVUELTO"] } },
    select: { id: true, momento: true },
  });
  if (abierto) {
    return NextResponse.json(
      {
        error: {
          _root: [
            `Ese aprendiz ya tiene un plan de mejoramiento sin cerrar (Momento ${abierto.momento}). Ciérralo antes de abrir otro.`,
          ],
        },
      },
      { status: 409 },
    );
  }

  const plan = await prisma.planMejoramiento.create({
    data: {
      userId: d.userId,
      momento: d.momento,
      resultadosNoSuperados: d.resultadosNoSuperados,
      actividades: d.actividades,
      evidencias: d.evidencias,
      llamadosPrevios: d.llamadosPrevios,
      diasPlazo: d.diasPlazo,
      creadoPorId: user.id,
    },
    select: { id: true },
  });

  return NextResponse.json({ plan }, { status: 201 });
}
