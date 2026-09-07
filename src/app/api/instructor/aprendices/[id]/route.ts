import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { FechasEtapaProductivaSchema } from "@/lib/validations";
import { validarFechaInicioEtapaProductiva } from "@/lib/etapa-productiva-fechas";

// Corrige las fechas de inicio/fin de Etapa Productiva de UN aprendiz de las fichas asignadas al
// instructor — el sistema ya las calculó al crear la cuenta desde `Ficha.fechaInicioProductiva`
// (ver src/lib/etapa-productiva-fechas.ts), pero cada aprendiz puede iniciar en una fecha real
// distinta según cuándo lo reciba la empresa. Único campo editable acá; el resto de los datos del
// aprendiz los gestiona Coordinación.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const { id } = await params;

  const aprendiz = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      alternativaEtapaProductiva: true,
      ficha: {
        select: { instructorId: true, fechaInicioProductiva: true, fechaLimiteIniciarEP: true },
      },
    },
  });
  if (!aprendiz || aprendiz.role !== "APRENDIZ") {
    return NextResponse.json({ error: { _root: ["El aprendiz no existe."] } }, { status: 404 });
  }
  if (aprendiz.ficha?.instructorId !== user.id) {
    return NextResponse.json(
      { error: { _root: ["No autorizado: este aprendiz no está en tus fichas asignadas."] } },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = FechasEtapaProductivaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  if (d.fechaInicioEtapaProductiva) {
    const errorFecha = validarFechaInicioEtapaProductiva({
      fechaInicioPropuesta: new Date(d.fechaInicioEtapaProductiva),
      fechaInicioProductivaFicha: aprendiz.ficha?.fechaInicioProductiva ?? null,
      fechaLimiteIniciarEPFicha: aprendiz.ficha?.fechaLimiteIniciarEP ?? null,
      esVinculoLaboral: aprendiz.alternativaEtapaProductiva === "VINCULO_LABORAL",
    });
    if (errorFecha) {
      return NextResponse.json(
        { error: { fechaInicioEtapaProductiva: [errorFecha] } },
        { status: 400 },
      );
    }
  }

  const actualizado = await prisma.user.update({
    where: { id },
    data: {
      fechaInicioEtapaProductiva:
        d.fechaInicioEtapaProductiva !== undefined
          ? d.fechaInicioEtapaProductiva
            ? new Date(d.fechaInicioEtapaProductiva)
            : null
          : undefined,
      fechaFinEtapaProductiva:
        d.fechaFinEtapaProductiva !== undefined
          ? d.fechaFinEtapaProductiva
            ? new Date(d.fechaFinEtapaProductiva)
            : null
          : undefined,
    },
    select: { id: true, fechaInicioEtapaProductiva: true, fechaFinEtapaProductiva: true },
  });

  return NextResponse.json({ aprendiz: actualizado });
}
