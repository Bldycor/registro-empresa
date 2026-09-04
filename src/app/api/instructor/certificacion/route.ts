import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import type { Prisma } from "@/generated/prisma/client";

const CERTIFICACION_SELECT = {
  id: true,
  fecha: true,
  archivoUrl: true,
  estado: true,
  observaciones: true,
  fechaAval: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      cedula: true,
      fechaFinEtapaProductiva: true,
      ficha: { select: { codigo: true } },
    },
  },
} satisfies Prisma.CertificacionEmpresarioSelect;

// Lista las certificaciones del empresario de los aprendices asignados al instructor (misma
// regla que el resto de la app: el instructor solo evalúa/avala a los aprendices de su(s) propia(s)
// ficha(s)).
export async function GET() {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const certificaciones = await prisma.certificacionEmpresario.findMany({
    where: { user: { ficha: { instructorId: user.id } } },
    select: CERTIFICACION_SELECT,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ certificaciones });
}
