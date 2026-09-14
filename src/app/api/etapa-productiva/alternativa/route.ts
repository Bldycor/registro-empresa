import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { SeleccionAlternativaSchema, MAX_CAMBIOS_ALTERNATIVA } from "@/lib/validations";

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
} as const;

// Historial de solicitudes de selección/modificación de alternativa del propio aprendiz —
// alimenta la evidencia (a) en su panel.
export async function GET() {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const selecciones = await prisma.seleccionAlternativaEP.findMany({
    where: { userId: user.id },
    select: SELECCION_SELECT,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ selecciones });
}

// El aprendiz envía una nueva solicitud (selección inicial o modificación posterior). Queda
// PENDIENTE hasta que el coordinador/admin la avale — solo entonces se sincronizan los campos
// vigentes en User (alternativa, subtipo, fechas de Etapa Productiva).
export async function POST(request: Request) {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const body = await request.json();
  const parsed = SeleccionAlternativaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const d = parsed.data;

  // Con la práctica aplazada el camino de vuelta es la reanudación, no una alternativa nueva: el
  // aplazamiento tiene su propio cierre (`fechaReanudacionReal`), y aprobar una alternativa acá
  // dejaría al aprendiz con fechas nuevas pero el aplazamiento abierto para siempre.
  const estadoActual = await prisma.user.findUnique({
    where: { id: user.id },
    select: { estado: true },
  });
  if (estadoActual?.estado === "APLAZADA") {
    return NextResponse.json(
      {
        error: {
          _root: [
            "Tu práctica está aplazada. Cuando vuelvas, Coordinación registra la reanudación y sigues con la misma alternativa.",
          ],
        },
      },
      { status: 409 },
    );
  }
  if (estadoActual?.estado === "DESERTADO") {
    return NextResponse.json(
      {
        error: {
          _root: [
            "Tu proceso está cerrado por deserción. Consulta con tu Coordinación Académica.",
          ],
        },
      },
      { status: 409 },
    );
  }

  // Tope de la guía GFPI-G-040 §9.3.1: hasta tres (3) modificaciones de alternativa en todo el
  // proceso formativo. Se cuentan las ya avaladas — las rechazadas o pendientes no gastan cupo.
  if (d.tipoSolicitud === "MODIFICACION") {
    const cambiosAprobados = await prisma.seleccionAlternativaEP.count({
      where: { userId: user.id, tipoSolicitud: "MODIFICACION", estado: "APROBADA" },
    });
    if (cambiosAprobados >= MAX_CAMBIOS_ALTERNATIVA) {
      return NextResponse.json(
        {
          error: {
            _root: [
              `Ya usaste los ${MAX_CAMBIOS_ALTERNATIVA} cambios de alternativa permitidos durante tu proceso formativo (guía GFPI-G-040). Consulta con tu Coordinación Académica.`,
            ],
          },
        },
        { status: 409 },
      );
    }
  }

  const seleccion = await prisma.seleccionAlternativaEP.create({
    data: {
      userId: user.id,
      tipoSolicitud: d.tipoSolicitud,
      fechaSolicitud: new Date(),
      alternativa: d.alternativa,
      subtipoAlternativa: d.subtipoAlternativa ?? null,
      fechaInicioEjecucion: new Date(d.fechaInicioEjecucion),
      fechaFinEjecucion: new Date(d.fechaFinEjecucion),
      archivoUrl: d.archivoUrl,
    },
    select: SELECCION_SELECT,
  });

  return NextResponse.json({ seleccion }, { status: 201 });
}
