import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { CoordinadorAprendicesPanel } from "@/components/coordinador-aprendices-panel";
import { evaluarRiesgoDesercion } from "@/lib/desercion";

export const dynamic = "force-dynamic";

export default async function CoordinadorAprendicesPage() {
  await requireUser(["COORDINADOR", "ADMIN"]);

  const [aprendices, fichas, instructores] = await Promise.all([
    prisma.user.findMany({
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
            instructor: { select: { id: true, nombres: true, apellidos: true, coordinacion: true } },
          },
        },
      },
      orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
    }),
    prisma.ficha.findMany({
      select: { id: true, codigo: true },
      orderBy: { codigo: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "INSTRUCTOR" },
      select: { id: true, nombres: true, apellidos: true, coordinacion: true },
      orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
    }),
  ]);

  const hoy = new Date();

  const aprendicesSerializados = aprendices.map(({ concertacionFuncion, ficha, ...a }) => ({
    ...a,
    // `fechaFinFormacion` solo se necesita para calcular el riesgo acá; el panel no la usa.
    ficha: ficha ? { id: ficha.id, codigo: ficha.codigo, programa: ficha.programa, instructor: ficha.instructor } : null,
    fechaInicioEtapaProductiva: a.fechaInicioEtapaProductiva?.toISOString() ?? null,
    fechaFinEtapaProductiva: a.fechaFinEtapaProductiva?.toISOString() ?? null,
    fechaNacimiento: a.fechaNacimiento?.toISOString() ?? null,
    fechaDesercion: a.fechaDesercion?.toISOString() ?? null,
    riesgoDesercion: evaluarRiesgoDesercion({
      hoy,
      estado: a.estado,
      fechaFinFormacionFicha: ficha?.fechaFinFormacion ?? null,
      concertacionFecha: concertacionFuncion?.fecha ?? null,
      practicaInterrumpida: a.estado === "PRACTICA_INTERRUMPIDA",
    }),
  }));

  return (
    <div className="flex flex-1 justify-center px-4 py-10">
      <CoordinadorAprendicesPanel
        initialAprendices={aprendicesSerializados}
        fichas={fichas}
        instructores={instructores}
      />
    </div>
  );
}
