import { requireUser } from "@/lib/auth-guards";
import { InstructorSeguimientoPanel } from "@/components/instructor-seguimiento-panel";

export const dynamic = "force-dynamic";

export default async function InstructorSeguimientoPage() {
  await requireUser(["INSTRUCTOR"]);

  return (
    <div className="flex flex-1 flex-col px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Seguimiento
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Cumplimiento de las 6 evidencias de cada aprendiz de tus fichas, según su propia fecha
          de inicio de Etapa Productiva — quién está al día y quién necesita seguimiento ya.
        </p>
        <InstructorSeguimientoPanel />
      </div>
    </div>
  );
}
