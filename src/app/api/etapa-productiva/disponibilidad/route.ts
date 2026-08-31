import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get("fecha");
  // "concertacion" (Momento 1, respaldo Jitsi) se cruza contra el calendario de la coordinación
  // (fijo para todos); "evaluacion" (Momento 2/3) contra el de su propio instructor — son
  // reuniones con revisores distintos, así que el conflicto de horario también lo es.
  const tipo = searchParams.get("tipo") === "evaluacion" ? "evaluacion" : "concertacion";

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }

  const fechaDate = new Date(`${fecha}T00:00:00.000Z`);

  if (tipo === "concertacion") {
    const citas = await prisma.concertacionFuncion.findMany({
      where: { fecha: fechaDate, userId: { not: session.user.id } },
      select: { horaInicio: true, horaFin: true },
      orderBy: { horaInicio: "asc" },
    });
    return NextResponse.json({ ocupados: citas });
  }

  const yo = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { ficha: { select: { instructorId: true } } },
  });
  const instructorId = yo?.ficha?.instructorId;
  if (!instructorId) {
    return NextResponse.json({ ocupados: [] });
  }

  const reuniones = await prisma.evaluacion.findMany({
    where: {
      fecha: fechaDate,
      userId: { not: session.user.id },
      user: { ficha: { instructorId } },
    },
    select: { horaInicio: true, horaFin: true },
  });

  return NextResponse.json({
    ocupados: reuniones
      .filter((r): r is { horaInicio: string; horaFin: string } => Boolean(r.horaInicio && r.horaFin))
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
  });
}
