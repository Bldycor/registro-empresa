import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";

// Reuniones extraordinarias de los aprendices de las fichas del instructor, para aprobarlas o
// rechazarlas. Mismo alcance que el resto de sus paneles: solo sus propias fichas.
export async function GET() {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const reuniones = await prisma.evaluacion.findMany({
    where: { esExtraordinario: true, user: { ficha: { instructorId: user.id } } },
    select: {
      id: true,
      fecha: true,
      horaInicio: true,
      horaFin: true,
      modalidad: true,
      motivoExtraordinario: true,
      solicitadaPor: true,
      estado: true,
      observaciones: true,
      videollamadaUrl: true,
      fechaAval: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          nombres: true,
          apellidos: true,
          cedula: true,
          ficha: { select: { codigo: true, programa: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reuniones });
}
