import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import type { Prisma } from "@/generated/prisma/client";

const BITACORA_SELECT = {
  id: true,
  numero: true,
  periodoDesde: true,
  periodoHasta: true,
  fechaLimite: true,
  fechaEntrega: true,
  archivoUrl: true,
  arlAfiliado: true,
  arlNivelRiesgo: true,
  arlRiesgoCorresponde: true,
  arlTieneEPP: true,
  estado: true,
  observaciones: true,
  createdAt: true,
  actividades: {
    select: { id: true, descripcion: true, competencias: true, evidenciaCumplimiento: true },
  },
  user: {
    select: { id: true, nombres: true, apellidos: true, cedula: true, ficha: { select: { codigo: true } } },
  },
} satisfies Prisma.BitacoraSelect;

// Lista las bitácoras de los aprendices asignados al instructor (misma regla que el resto de la
// app: solo evalúa/avala a los aprendices de su(s) propia(s) ficha(s)).
export async function GET() {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const bitacoras = await prisma.bitacora.findMany({
    where: { user: { ficha: { instructorId: user.id } } },
    select: BITACORA_SELECT,
    orderBy: [{ user: { nombres: "asc" } }, { numero: "asc" }],
  });

  return NextResponse.json({ bitacoras });
}
