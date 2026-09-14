import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import type { Prisma } from "@/generated/prisma/client";

const APLAZAMIENTO_SELECT = {
  id: true,
  alternativa: true,
  fechaInicioTramo: true,
  fechaSuspension: true,
  fechaReanudacionPrevista: true,
  fechaReanudacionReal: true,
  diasEjecutados: true,
  motivo: true,
  motivoDetalle: true,
  soporteUrl: true,
  estado: true,
  fechaAval: true,
  observacionesAval: true,
  actaComite: true,
  fechaActaComite: true,
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
} satisfies Prisma.AplazamientoEtapaProductivaSelect;

// Solicitudes de aplazamiento por novedad, para autorización del Comité de Evaluación y
// Seguimiento (guía GFPI-G-040 §9.3). Quien las registra en SEPA es Coordinación/Admin: el
// Comité es un cuerpo colegiado que decide en acta, no una cuenta del sistema.
export async function GET() {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const aplazamientos = await prisma.aplazamientoEtapaProductiva.findMany({
    select: APLAZAMIENTO_SELECT,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ aplazamientos });
}
