import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { AvalInterrupcionEPSchema } from "@/lib/validations";

// Coordinación avala (o rechaza) la interrupción de un tramo de Etapa Productiva.
//
// Al aprobarla se ejecuta lo que exige la guía GFPI-G-040 §9.3.1: el tiempo realmente cumplido en
// la alternativa que se interrumpe queda contabilizado (`User.diasEjecutadosPrevios`) para
// descontarlo del tramo siguiente, y el aprendiz pasa a PRACTICA_INTERRUMPIDA — no queda
// "atrasado" en el seguimiento mientras consigue y le avalan la nueva alternativa. La fecha fin
// vigente se recorta al día de la interrupción para que el histórico no muestre un tramo que en
// realidad no se ejecutó completo.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const { id } = await params;

  const existing = await prisma.interrupcionEtapaProductiva.findUnique({
    where: { id },
    select: { id: true, userId: true, estado: true, diasEjecutados: true, fechaInterrupcion: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "La interrupción no existe." }, { status: 404 });
  }
  if (existing.estado !== "PENDIENTE") {
    return NextResponse.json(
      { error: "Esta interrupción ya fue resuelta." },
      { status: 409 },
    );
  }

  const body = await request.json();
  const parsed = AvalInterrupcionEPSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;
  const diasEjecutados = d.diasEjecutados ?? existing.diasEjecutados;

  const interrupcion = await prisma.$transaction(async (tx) => {
    const actualizada = await tx.interrupcionEtapaProductiva.update({
      where: { id },
      data: {
        estado: d.estado,
        diasEjecutados,
        avaladoPorId: user.id,
        fechaAval: new Date(),
        observacionesAval: d.observacionesAval ?? null,
      },
    });

    if (d.estado === "APROBADA") {
      const aprendiz = await tx.user.findUnique({
        where: { id: existing.userId },
        select: { diasEjecutadosPrevios: true, bitacoras: { select: { numero: true, estado: true } } },
      });

      // La numeración de bitácoras continúa donde quedó: el tramo siguiente arranca en la
      // primera que todavía no está aprobada, para que el aprendiz no repita las ya avaladas.
      const aprobadas = (aprendiz?.bitacoras ?? []).filter((b) => b.estado === "APROBADA").length;

      await tx.user.update({
        where: { id: existing.userId },
        data: {
          estado: "PRACTICA_INTERRUMPIDA",
          diasEjecutadosPrevios: (aprendiz?.diasEjecutadosPrevios ?? 0) + diasEjecutados,
          bitacoraInicioTramo: aprobadas + 1,
          fechaFinEtapaProductiva: existing.fechaInterrupcion,
        },
      });
    }

    return actualizada;
  });

  return NextResponse.json({ interrupcion });
}
