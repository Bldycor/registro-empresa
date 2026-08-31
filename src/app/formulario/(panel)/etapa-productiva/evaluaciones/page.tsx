import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { ConcertacionForm } from "@/components/concertacion-form";
import { EvaluacionMomento, type EvaluacionMomentoData } from "@/components/evaluacion-momento";

export const dynamic = "force-dynamic";

export default async function EtapaProductivaPage() {
  const currentUser = await requireUser(["APRENDIZ"]);

  const [profile, concertacion, evaluaciones, aprendiz] = await Promise.all([
    prisma.companyProfile.findUnique({ where: { userId: currentUser.id } }),
    prisma.concertacionFuncion.findUnique({ where: { userId: currentUser.id } }),
    prisma.evaluacion.findMany({
      where: { userId: currentUser.id, numero: { in: [2, 3] }, esExtraordinario: false },
      include: { variables: true },
      orderBy: { numero: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { ficha: { select: { instructor: { select: { nombres: true, apellidos: true } } } } },
    }),
  ]);

  if (!profile) {
    redirect("/formulario");
  }

  const instructorNombre = aprendiz?.ficha?.instructor
    ? `${aprendiz.ficha.instructor.nombres} ${aprendiz.ficha.instructor.apellidos}`
    : null;

  function mapEvaluacion(numero: 2 | 3): EvaluacionMomentoData | null {
    const e = evaluaciones.find((ev) => ev.numero === numero);
    if (!e) return null;
    return {
      id: e.id,
      numero: e.numero,
      fecha: e.fecha?.toISOString() ?? null,
      horaInicio: e.horaInicio,
      horaFin: e.horaFin,
      modalidad: e.modalidad,
      videollamadaUrl: e.videollamadaUrl,
      juicioFinal: e.juicioFinal,
      retroalimentacionCoformador: e.retroalimentacionCoformador,
      retroalimentacionInstructor: e.retroalimentacionInstructor,
      retroalimentacionAprendiz: e.retroalimentacionAprendiz,
      estado: e.estado as "PENDIENTE" | "APROBADA" | "RECHAZADA",
      variables: e.variables.map((v) => ({
        variable: v.variable,
        categoria: v.categoria,
        valoracion: v.valoracion,
        observaciones: v.observaciones,
      })),
    };
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-8 px-4 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Evaluaciones
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Formato GFPI-F-023 — 3 momentos: Planeación (concertación), Seguimiento y Cierre. Tu
          instructor registra la rúbrica de cada momento tras la reunión.
        </p>
      </div>

      <div className="w-full max-w-2xl">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Momento 1 — Planeación
        </h2>
        <ConcertacionForm
          initialData={
            concertacion
              ? {
                  fecha: concertacion.fecha.toISOString().slice(0, 10),
                  horaInicio: concertacion.horaInicio,
                  horaFin: concertacion.horaFin,
                }
              : null
          }
          videollamadaUrl={concertacion?.videollamadaUrl ?? null}
        />
      </div>

      <div className="w-full max-w-2xl">
        <EvaluacionMomento numero={2} data={mapEvaluacion(2)} instructorNombre={instructorNombre} />
      </div>

      <div className="w-full max-w-2xl">
        <EvaluacionMomento numero={3} data={mapEvaluacion(3)} instructorNombre={instructorNombre} />
      </div>
    </div>
  );
}
