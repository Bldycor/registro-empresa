import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { FechasEtapaProductivaFichaSchema } from "@/lib/validations";
import {
  calcularFechaFinEtapaProductiva,
  validarFechaInicioEtapaProductiva,
} from "@/lib/etapa-productiva-fechas";

// Aplica la misma fecha de inicio (y fin, calculada sola si no se da) de Etapa Productiva a TODOS
// los aprendices de una ficha asignada al instructor de una sola vez — para cuando toda una
// cohorte real arranca junta y corregirlos uno a uno sería repetitivo. Sigue siendo posible
// corregir a un aprendiz individual después (PATCH /api/instructor/aprendices/[id]), por ejemplo
// si esa empresa en particular lo recibió en otra fecha.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["INSTRUCTOR"]);
  if (!user) return response;

  const { id } = await params;

  const ficha = await prisma.ficha.findUnique({
    where: { id },
    select: {
      id: true,
      instructorId: true,
      fechaInicioProductiva: true,
      fechaLimiteIniciarEP: true,
    },
  });
  if (!ficha) {
    return NextResponse.json({ error: { _root: ["La ficha no existe."] } }, { status: 404 });
  }
  if (ficha.instructorId !== user.id) {
    return NextResponse.json(
      { error: { _root: ["No autorizado: esta ficha no está asignada a tu cuenta."] } },
      { status: 403 },
    );
  }

  const body = await request.json();
  const parsed = FechasEtapaProductivaFichaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  const fechaInicioEtapaProductiva = new Date(d.fechaInicioEtapaProductiva);

  // Regla estricta (sin la excepción de Vínculo laboral): esta acción aplica la misma fecha a
  // TODA la ficha, que puede mezclar alternativas — el adelanto de 3 meses de Vínculo laboral es
  // una excepción individual (cada vínculo laboral ya existente tiene su propia fecha real), no
  // algo que tenga sentido aplicar en bloque a un grupo.
  const errorFecha = validarFechaInicioEtapaProductiva({
    fechaInicioPropuesta: fechaInicioEtapaProductiva,
    fechaInicioProductivaFicha: ficha.fechaInicioProductiva,
    fechaLimiteIniciarEPFicha: ficha.fechaLimiteIniciarEP,
    esVinculoLaboral: false,
  });
  if (errorFecha) {
    return NextResponse.json({ error: { fechaInicioEtapaProductiva: [errorFecha] } }, { status: 400 });
  }

  const fechaFinEtapaProductiva = d.fechaFinEtapaProductiva
    ? new Date(d.fechaFinEtapaProductiva)
    : calcularFechaFinEtapaProductiva(fechaInicioEtapaProductiva);

  const resultado = await prisma.user.updateMany({
    where: { fichaId: id, role: "APRENDIZ" },
    data: {
      fechaInicioEtapaProductiva,
      fechaFinEtapaProductiva,
      totalBitacoras: d.totalBitacoras,
    },
  });

  return NextResponse.json({
    actualizados: resultado.count,
    fechaInicioEtapaProductiva: fechaInicioEtapaProductiva.toISOString(),
    fechaFinEtapaProductiva: fechaFinEtapaProductiva.toISOString(),
    totalBitacoras: d.totalBitacoras,
  });
}
