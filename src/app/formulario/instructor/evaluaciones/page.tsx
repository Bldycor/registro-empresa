import { requireUser } from "@/lib/auth-guards";
import { InstructorEvaluacionesPanel } from "@/components/instructor-evaluaciones-panel";
import { PlantillaEnlace, PLANTILLA_EVALUACION } from "@/components/plantilla-enlace";

export const dynamic = "force-dynamic";

export default async function InstructorEvaluacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ aprendiz?: string }>;
}) {
  await requireUser(["INSTRUCTOR"]);
  // Desde un chip de Seguimiento llega el aprendiz, para centrar la pantalla en él.
  const { aprendiz } = await searchParams;

  return (
    <div className="flex flex-1 flex-col px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Evaluaciones
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Registra la valoración de Momento 1 (concertación), Momento 2 (seguimiento) y Momento 3
          (cierre) de los aprendices de tus fichas asignadas, tras la reunión agendada.
        </p>
        <div className="-mt-4 mb-6">
          <PlantillaEnlace plantilla={PLANTILLA_EVALUACION} />
        </div>
        <InstructorEvaluacionesPanel key={aprendiz ?? ""} aprendizId={aprendiz ?? null} />
      </div>
    </div>
  );
}
