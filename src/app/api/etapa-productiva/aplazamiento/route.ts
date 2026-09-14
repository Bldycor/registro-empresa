import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { AplazamientoEPSchema } from "@/lib/validations";
import { diasEntre } from "@/lib/etapa-productiva-fechas";

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
} as const;

// Historial de aplazamientos del propio aprendiz.
export async function GET() {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const aplazamientos = await prisma.aplazamientoEtapaProductiva.findMany({
    where: { userId: user.id },
    select: APLAZAMIENTO_SELECT,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ aplazamientos });
}

// El aprendiz radica una novedad que le impide continuar temporalmente (guía GFPI-G-040 §9.3):
// licencia de maternidad, incapacidad, vacaciones colectivas, cese de actividad de la empresa o
// fuerza mayor. A diferencia de la interrupción, vuelve con la MISMA alternativa — no necesita
// un GFPI-F-165 nuevo. Queda PENDIENTE hasta que el Comité de Evaluación y Seguimiento lo
// autorice: solo entonces se detienen los plazos y se acumula el tiempo cumplido.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const body = await request.json();
  const parsed = AplazamientoEPSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  const aprendiz = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      estado: true,
      alternativaEtapaProductiva: true,
      fechaInicioEtapaProductiva: true,
      aplazamientosEP: { where: { estado: "PENDIENTE" }, select: { id: true }, take: 1 },
      interrupcionesEP: { where: { estado: "PENDIENTE" }, select: { id: true }, take: 1 },
    },
  });

  if (!aprendiz?.alternativaEtapaProductiva || !aprendiz.fechaInicioEtapaProductiva) {
    return NextResponse.json(
      {
        error: {
          _root: ["Todavía no tienes una Etapa Productiva en curso que puedas aplazar."],
        },
      },
      { status: 409 },
    );
  }
  if (aprendiz.estado === "CERTIFICADO" || aprendiz.estado === "DESERTADO") {
    return NextResponse.json(
      { error: { _root: ["Tu proceso ya está cerrado."] } },
      { status: 409 },
    );
  }
  if (aprendiz.estado === "APLAZADA") {
    return NextResponse.json(
      { error: { _root: ["Tu práctica ya está aplazada."] } },
      { status: 409 },
    );
  }
  if (aprendiz.aplazamientosEP.length > 0) {
    return NextResponse.json(
      { error: { _root: ["Ya tienes una solicitud de aplazamiento pendiente de autorización."] } },
      { status: 409 },
    );
  }
  // Aplazar e interrumpir son decisiones excluyentes sobre el mismo tramo: si las dos estuvieran
  // pendientes a la vez, avalarlas en cualquier orden dejaría los días contados dos veces.
  if (aprendiz.interrupcionesEP.length > 0) {
    return NextResponse.json(
      {
        error: {
          _root: [
            "Ya reportaste una interrupción de tu práctica que está pendiente de aval. Espera la respuesta de Coordinación antes de solicitar un aplazamiento.",
          ],
        },
      },
      { status: 409 },
    );
  }

  const fechaSuspension = new Date(`${d.fechaSuspension}T00:00:00.000Z`);
  if (fechaSuspension < aprendiz.fechaInicioEtapaProductiva) {
    return NextResponse.json(
      {
        error: {
          fechaSuspension: ["La fecha no puede ser anterior al inicio de tu Etapa Productiva."],
        },
      },
      { status: 400 },
    );
  }

  const aplazamiento = await prisma.aplazamientoEtapaProductiva.create({
    data: {
      userId: user.id,
      alternativa: aprendiz.alternativaEtapaProductiva,
      fechaInicioTramo: aprendiz.fechaInicioEtapaProductiva,
      fechaSuspension,
      fechaReanudacionPrevista: new Date(`${d.fechaReanudacionPrevista}T00:00:00.000Z`),
      // Sugerido por calendario; el Comité lo confirma o corrige contra el soporte.
      diasEjecutados: diasEntre(aprendiz.fechaInicioEtapaProductiva, fechaSuspension),
      motivo: d.motivo,
      motivoDetalle: d.motivoDetalle || null,
      soporteUrl: d.soporteUrl || null,
    },
    select: APLAZAMIENTO_SELECT,
  });

  return NextResponse.json({ aplazamiento }, { status: 201 });
}
