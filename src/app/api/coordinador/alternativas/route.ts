import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { SeleccionAlternativaGrupalSchema } from "@/lib/validations";
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

// Lista todas las solicitudes de selección/modificación de alternativa, para que
// Coordinador/Admin las revise y avale — mapea "coordinación académica"/"líder de contrato de
// aprendizaje" del formato real a estos dos roles.
export async function GET() {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const selecciones = await prisma.seleccionAlternativaEP.findMany({
    select: SELECCION_SELECT,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ selecciones });
}

// Modo grupal (formato GFPI-F-165 grupal): el coordinador/instructor diligencia la misma
// alternativa para varios aprendices de una misma ficha en un solo envío.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const body = await request.json();
  const parsed = SeleccionAlternativaGrupalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  const aprendices = await prisma.user.findMany({
    where: { id: { in: d.userIds }, fichaId: d.fichaId, role: "APRENDIZ" },
    select: { id: true },
  });
  if (aprendices.length !== d.userIds.length) {
    return NextResponse.json(
      { error: { userIds: ["Alguno de los aprendices seleccionados no pertenece a esta ficha."] } },
      { status: 400 },
    );
  }

  const grupo = await prisma.seleccionAlternativaGrupo.create({
    data: {
      fichaId: d.fichaId,
      creadoPorId: user.id,
      selecciones: {
        create: aprendices.map((aprendiz) => ({
          userId: aprendiz.id,
          tipoSolicitud: d.tipoSolicitud,
          fechaSolicitud: new Date(),
          alternativa: d.alternativa,
          subtipoAlternativa: d.subtipoAlternativa ?? null,
          fechaInicioEjecucion: new Date(d.fechaInicioEjecucion),
          fechaFinEjecucion: new Date(d.fechaFinEjecucion),
          archivoUrl: d.archivoUrl,
        })),
      },
    },
    include: { selecciones: { select: SELECCION_SELECT } },
  });

  return NextResponse.json({ selecciones: grupo.selecciones }, { status: 201 });
}
