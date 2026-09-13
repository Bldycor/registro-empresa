import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import type { Prisma } from "@/generated/prisma/client";

const INTERRUPCION_SELECT = {
  id: true,
  alternativa: true,
  fechaInicioTramo: true,
  fechaInterrupcion: true,
  diasEjecutados: true,
  motivo: true,
  motivoDetalle: true,
  certificadoUrl: true,
  estado: true,
  fechaAval: true,
  observacionesAval: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      cedula: true,
      estado: true,
      diasEjecutadosPrevios: true,
      ficha: { select: { codigo: true, programa: true } },
    },
  },
} satisfies Prisma.InterrupcionEtapaProductivaSelect;

// Interrupciones de Etapa Productiva reportadas por los aprendices, para aval de Coordinación
// (guía GFPI-G-040 §9.3.1: es la Coordinación Académica quien avala el cambio de alternativa y
// quien, con el instructor de seguimiento, analiza el tiempo ya ejecutado).
export async function GET() {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const interrupciones = await prisma.interrupcionEtapaProductiva.findMany({
    select: INTERRUPCION_SELECT,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ interrupciones });
}
