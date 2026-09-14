import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { AvalAplazamientoEPSchema, ReanudacionEPSchema } from "@/lib/validations";
import { calcularFechaFinConTiempoPrevio } from "@/lib/etapa-productiva-fechas";

// Dos acciones sobre un aplazamiento, en este orden:
//
//   PATCH  { estado, actaComite, fechaActaComite, … }  → el Comité autoriza (o niega) la novedad.
//   PATCH  { fechaReanudacionReal }                    → el aprendiz volvió; arranca el tramo nuevo.
//
// Al autorizar se aplica exactamente la misma mecánica del cambio de alternativa (§9.3.1): el
// tiempo cumplido hasta la suspensión se acumula en `User.diasEjecutadosPrevios` y la numeración
// de bitácoras se congela donde iba. La diferencia es que aquí la alternativa NO cambia, así que
// al reanudar no hace falta un GFPI-F-165 nuevo — basta con fijar la fecha de regreso y el
// sistema calcula la fecha fin con el tiempo que le faltaba.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const { id } = await params;

  const existing = await prisma.aplazamientoEtapaProductiva.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      estado: true,
      diasEjecutados: true,
      fechaSuspension: true,
      fechaReanudacionReal: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "El aplazamiento no existe." }, { status: 404 });
  }

  const body = await request.json();

  // ---- Registro de reanudación -------------------------------------------------------------
  if ("fechaReanudacionReal" in body) {
    if (existing.estado !== "APROBADA") {
      return NextResponse.json(
        { error: "Solo se puede reanudar un aplazamiento ya autorizado por el Comité." },
        { status: 409 },
      );
    }
    if (existing.fechaReanudacionReal) {
      return NextResponse.json(
        { error: "Este aplazamiento ya tiene registrada su reanudación." },
        { status: 409 },
      );
    }

    const parsed = ReanudacionEPSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const fechaReanudacion = new Date(`${parsed.data.fechaReanudacionReal}T00:00:00.000Z`);
    if (fechaReanudacion <= existing.fechaSuspension) {
      return NextResponse.json(
        {
          error: {
            fechaReanudacionReal: ["La reanudación debe ser posterior al último día de práctica."],
          },
        },
        { status: 400 },
      );
    }

    const aplazamiento = await prisma.$transaction(async (tx) => {
      const actualizado = await tx.aplazamientoEtapaProductiva.update({
        where: { id },
        data: { fechaReanudacionReal: fechaReanudacion },
      });

      const aprendiz = await tx.user.findUnique({
        where: { id: existing.userId },
        select: { diasEjecutadosPrevios: true },
      });
      const diasPrevios = aprendiz?.diasEjecutadosPrevios ?? 0;

      await tx.user.update({
        where: { id: existing.userId },
        data: {
          estado: "ACTIVO",
          fechaInicioEtapaProductiva: fechaReanudacion,
          fechaFinEtapaProductiva: calcularFechaFinConTiempoPrevio(fechaReanudacion, diasPrevios),
        },
      });

      return actualizado;
    });

    return NextResponse.json({ aplazamiento });
  }

  // ---- Autorización del Comité --------------------------------------------------------------
  if (existing.estado !== "PENDIENTE") {
    return NextResponse.json({ error: "Este aplazamiento ya fue resuelto." }, { status: 409 });
  }

  const parsed = AvalAplazamientoEPSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;
  const diasEjecutados = d.diasEjecutados ?? existing.diasEjecutados;

  const aplazamiento = await prisma.$transaction(async (tx) => {
    const actualizado = await tx.aplazamientoEtapaProductiva.update({
      where: { id },
      data: {
        estado: d.estado,
        diasEjecutados,
        avaladoPorId: user.id,
        fechaAval: new Date(),
        observacionesAval: d.observacionesAval ?? null,
        actaComite: d.actaComite?.trim() || null,
        fechaActaComite: d.fechaActaComite
          ? new Date(`${d.fechaActaComite}T00:00:00.000Z`)
          : null,
      },
    });

    if (d.estado === "APROBADA") {
      const aprendiz = await tx.user.findUnique({
        where: { id: existing.userId },
        select: {
          diasEjecutadosPrevios: true,
          bitacoras: { select: { numero: true, estado: true } },
        },
      });

      // La numeración de bitácoras continúa donde quedó: el tramo siguiente arranca en la primera
      // que todavía no está aprobada, para que el aprendiz no repita las ya avaladas.
      const aprobadas = (aprendiz?.bitacoras ?? []).filter((b) => b.estado === "APROBADA").length;

      await tx.user.update({
        where: { id: existing.userId },
        data: {
          estado: "APLAZADA",
          diasEjecutadosPrevios: (aprendiz?.diasEjecutadosPrevios ?? 0) + diasEjecutados,
          bitacoraInicioTramo: aprobadas + 1,
          fechaFinEtapaProductiva: existing.fechaSuspension,
        },
      });
    }

    return actualizado;
  });

  return NextResponse.json({ aplazamiento });
}
