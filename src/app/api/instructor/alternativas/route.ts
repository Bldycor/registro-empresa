import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import type { Prisma } from "@/generated/prisma/client";

const SELECCION_SELECT = {
  id: true,
  tipoSolicitud: true,
  fechaSolicitud: true,
  alternativa: true,
  subtipoAlternativa: true,
  fechaInicioEjecucion: true,
  fechaFinEjecucion: true,
  archivoUrl: true,
  estado: true,
  observacionesAval: true,
  fechaAval: true,
  createdAt: true,
  grupoId: true,
  user: {
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      cedula: true,
      ficha: {
        select: {
          codigo: true,
          programa: true,
          instructor: { select: { nombres: true, apellidos: true } },
        },
      },
    },
  },
} satisfies Prisma.SeleccionAlternativaEPSelect;

// Lista las solicitudes de Alternativa EP de los aprendices de las fichas asignadas al
// instructor — mismo formato/UI que el panel de Coordinador, pero acotado a su propia ficha.
export async function GET() {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const selecciones = await prisma.seleccionAlternativaEP.findMany({
    where: { user: { ficha: { instructorId: user.id } } },
    select: SELECCION_SELECT,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ selecciones });
}
