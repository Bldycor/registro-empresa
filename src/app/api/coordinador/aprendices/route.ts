import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { evaluarRiesgoDesercion } from "@/lib/desercion";
import { advertenciaPlazoCulminacion, plazoMaximoCulminacion } from "@/lib/plazo-culminacion";

// Lista de todos los aprendices (con ficha o sin asignar) para el panel de gestión del
// Coordinador (o el ADMIN, que tiene control total). A diferencia de la vista del Instructor
// (solo lectura, filtrada por ficha), esta cubre a todos los aprendices del sistema.
export async function GET() {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const aprendices = await prisma.user.findMany({
    where: { role: "APRENDIZ" },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      cedula: true,
      email: true,
      celular: true,
      direccionResidencia: true,
      comuna: true,
      estado: true,
      alternativaEtapaProductiva: true,
      fichaId: true,
      fechaInicioEtapaProductiva: true,
      fechaFinEtapaProductiva: true,
      totalBitacoras: true,
      // Requisitos de aval (§9.1.1) y constancia de deserción (§9.1.1) — se gestionan desde este
      // mismo panel, que es donde Coordinación ya edita al aprendiz.
      fechaNacimiento: true,
      rapsEtapaLectivaAprobados: true,
      autorizacionMinTrabajoUrl: true,
      fechaDesercion: true,
      motivoDesercion: true,
      concertacionFuncion: { select: { fecha: true } },
      ficha: {
        select: {
          id: true,
          codigo: true,
          programa: true,
          fechaFinFormacion: true,
          fechaInicioProductiva: true,
          reglamento: true,
          instructor: { select: { id: true, nombres: true, apellidos: true, coordinacion: true } },
        },
      },
    },
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
  });

  const hoy = new Date();

  // El riesgo de deserción se calcula al leer, igual que el semáforo de evidencias: es una señal
  // para Coordinación, no un estado guardado. Ver src/lib/desercion.ts.
  const conRiesgo = aprendices.map(({ concertacionFuncion, ...a }) => ({
    ...a,
    riesgoDesercion: evaluarRiesgoDesercion({
      hoy,
      estado: a.estado,
      fechaFinFormacionFicha: a.ficha?.fechaFinFormacion ?? null,
      concertacionFecha: concertacionFuncion?.fecha ?? null,
      practicaInterrumpida: a.estado === "PRACTICA_INTERRUMPIDA",
    }),
    // Plazo de 24 meses del Acuerdo 007 de 2012: solo advierte (ver src/lib/plazo-culminacion.ts).
    advertenciaPlazo: advertenciaPlazoCulminacion({
      plazo: plazoMaximoCulminacion(a.ficha),
      fechaFin: a.fechaFinEtapaProductiva,
      hoy,
      estado: a.estado,
    }),
  }));

  return NextResponse.json({ aprendices: conRiesgo });
}
