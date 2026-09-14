import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { InterrupcionEPSchema } from "@/lib/validations";
import { diasEntre } from "@/lib/etapa-productiva-fechas";

const INTERRUPCION_SELECT = {
  id: true,
  alternativa: true,
  fechaInicioTramo: true,
  fechaInterrupcion: true,
  diasEjecutados: true,
  motivo: true,
  motivoDetalle: true,
  certificadoUrl: true,
  estado: true,
  fechaAval: true,
  observacionesAval: true,
  createdAt: true,
} as const;

// Historial de interrupciones del propio aprendiz (tramos de Etapa Productiva que no alcanzó a
// terminar con la alternativa que tenía vigente).
export async function GET() {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const interrupciones = await prisma.interrupcionEtapaProductiva.findMany({
    where: { userId: user.id },
    select: INTERRUPCION_SELECT,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ interrupciones });
}

// El aprendiz reporta que no pudo terminar su Etapa Productiva con la alternativa vigente (guía
// GFPI-G-040 §7 y §9.3.1). Queda PENDIENTE de aval de Coordinación: hasta que lo avalen no se
// acumula tiempo ni cambia el estado del aprendiz, porque el tiempo cumplido lo respalda el
// certificado del ente co-formador, no la sola declaración.
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const body = await request.json();
  const parsed = InterrupcionEPSchema.safeParse(body);
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
      interrupcionesEP: { where: { estado: "PENDIENTE" }, select: { id: true }, take: 1 },
      aplazamientosEP: { where: { estado: "PENDIENTE" }, select: { id: true }, take: 1 },
    },
  });

  if (!aprendiz?.alternativaEtapaProductiva || !aprendiz.fechaInicioEtapaProductiva) {
    return NextResponse.json(
      {
        error: {
          _root: [
            "Todavía no tienes una alternativa de Etapa Productiva vigente que puedas interrumpir.",
          ],
        },
      },
      { status: 409 },
    );
  }
  if (aprendiz.estado === "CERTIFICADO") {
    return NextResponse.json(
      { error: { _root: ["Tu proceso ya fue certificado."] } },
      { status: 409 },
    );
  }
  if (aprendiz.estado === "DESERTADO") {
    return NextResponse.json(
      { error: { _root: ["Tu proceso está cerrado por deserción. Consulta con tu Coordinación Académica."] } },
      { status: 409 },
    );
  }
  // Aplazar e interrumpir son decisiones excluyentes sobre el mismo tramo: si las dos llegaran a
  // avalarse, los días cumplidos se contarían dos veces.
  if (aprendiz.aplazamientosEP.length > 0) {
    return NextResponse.json(
      {
        error: {
          _root: [
            "Ya tienes una solicitud de aplazamiento pendiente de autorización del Comité. Espera la respuesta antes de reportar una interrupción.",
          ],
        },
      },
      { status: 409 },
    );
  }
  if (aprendiz.interrupcionesEP.length > 0) {
    return NextResponse.json(
      {
        error: {
          _root: ["Ya tienes un reporte de interrupción pendiente de aval de Coordinación."],
        },
      },
      { status: 409 },
    );
  }

  const fechaInterrupcion = new Date(`${d.fechaInterrupcion}T00:00:00.000Z`);
  if (fechaInterrupcion < aprendiz.fechaInicioEtapaProductiva) {
    return NextResponse.json(
      {
        error: {
          fechaInterrupcion: [
            "La fecha no puede ser anterior al inicio de tu Etapa Productiva.",
          ],
        },
      },
      { status: 400 },
    );
  }

  const interrupcion = await prisma.interrupcionEtapaProductiva.create({
    data: {
      userId: user.id,
      alternativa: aprendiz.alternativaEtapaProductiva,
      fechaInicioTramo: aprendiz.fechaInicioEtapaProductiva,
      fechaInterrupcion,
      // Sugerido por calendario; Coordinación lo confirma o corrige contra el certificado.
      diasEjecutados: diasEntre(aprendiz.fechaInicioEtapaProductiva, fechaInterrupcion),
      motivo: d.motivo,
      motivoDetalle: d.motivoDetalle || null,
      certificadoUrl: d.certificadoUrl || null,
    },
    select: INTERRUPCION_SELECT,
  });

  return NextResponse.json({ interrupcion }, { status: 201 });
}
