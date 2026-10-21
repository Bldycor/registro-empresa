import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { planBitacoras } from "@/lib/seguimiento-evidencias";
import { detalleDetencionPlazos } from "@/lib/validations";
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
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      cedula: true,
      ficha: { select: { codigo: true, programa: true } },
    },
  },
} satisfies Prisma.BitacoraSelect;

// Plan de bitácoras de un aprendiz (`?aprendiz=<id>`, el enlace del chip de Bitácoras en
// Seguimiento): el estado de cada una, incluidas las que todavía no ha enviado, que son
// justamente las atrasadas y no aparecen en la lista de entregadas.
async function planDelAprendiz(aprendizId: string, instructorId: string) {
  const a = await prisma.user.findFirst({
    where: { id: aprendizId, role: "APRENDIZ", ficha: { instructorId } },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      estado: true,
      fechaInicioEtapaProductiva: true,
      totalBitacoras: true,
      bitacoraInicioTramo: true,
      bitacoras: { select: { numero: true, estado: true } },
    },
  });
  if (!a) return null;

  const plan = a.fechaInicioEtapaProductiva
    ? planBitacoras({
        hoy: new Date(),
        fechaInicioEP: a.fechaInicioEtapaProductiva,
        bitacoras: a.bitacoras,
        totalBitacoras: a.totalBitacoras,
        bitacoraInicioTramo: a.bitacoraInicioTramo,
      })
    : null;

  return {
    id: a.id,
    nombres: a.nombres,
    apellidos: a.apellidos,
    totalBitacoras: a.totalBitacoras,
    // Con la práctica detenida no corre ningún plazo: lo vencido no es un atraso (mismo criterio
    // que el semáforo).
    detencion: detalleDetencionPlazos[a.estado] ?? null,
    sinFechaInicio: !a.fechaInicioEtapaProductiva,
    cumple: plan?.cumple ?? false,
    aprobadas: plan?.aprobadas ?? 0,
    cupos: (plan?.cupos ?? []).map((c) => ({ ...c, fechaLimite: c.fechaLimite.toISOString() })),
  };
}

// Lista las bitácoras de los aprendices asignados al instructor (misma regla que el resto de la
// app: solo evalúa/avala a los aprendices de su(s) propia(s) ficha(s)).
export async function GET(request: NextRequest) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const aprendizId = request.nextUrl.searchParams.get("aprendiz");

  const [bitacoras, plan] = await Promise.all([
    prisma.bitacora.findMany({
      where: { user: { ficha: { instructorId: user.id } } },
      select: BITACORA_SELECT,
      orderBy: [{ user: { nombres: "asc" } }, { numero: "asc" }],
    }),
    aprendizId ? planDelAprendiz(aprendizId, user.id) : null,
  ]);

  return NextResponse.json({ bitacoras, plan });
}
