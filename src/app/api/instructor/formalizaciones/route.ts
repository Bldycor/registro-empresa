import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import type { Prisma } from "@/generated/prisma/client";

const FORMALIZACION_SELECT = {
  id: true,
  tipoDocumento: true,
  fecha: true,
  archivoUrl: true,
  estado: true,
  observaciones: true,
  fechaAval: true,
  createdAt: true,
  user: { select: { id: true, nombres: true, apellidos: true, cedula: true, ficha: { select: { codigo: true } } } },
} satisfies Prisma.FormalizacionEtapaProductivaSelect;

// Lista las formalizaciones de los aprendices asignados al instructor (misma regla que el resto
// de la app: el instructor solo evalúa/avala a los aprendices de su(s) propia(s) ficha(s)).
export async function GET() {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const formalizaciones = await prisma.formalizacionEtapaProductiva.findMany({
    where: { user: { ficha: { instructorId: user.id } } },
    select: FORMALIZACION_SELECT,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ formalizaciones });
}
