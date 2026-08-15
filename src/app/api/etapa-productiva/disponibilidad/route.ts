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

  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }

  const fechaDate = new Date(`${fecha}T00:00:00.000Z`);

  const citas = await prisma.concertacionFuncion.findMany({
    where: { fecha: fechaDate, userId: { not: session.user.id } },
    select: { horaInicio: true, horaFin: true },
    orderBy: { horaInicio: "asc" },
  });

  return NextResponse.json({ ocupados: citas });
}
