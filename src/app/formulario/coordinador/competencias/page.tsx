import { requireUser } from "@/lib/auth-guards";
import { CompetenciasPanel } from "@/components/competencias-panel";

export const dynamic = "force-dynamic";

export default async function CompetenciasPage() {
  await requireUser(["COORDINADOR", "ADMIN"]);

  return (
    <div className="flex flex-1 flex-col px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Competencias por programa
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Catálogo de competencias/resultados de aprendizaje por programa de formación (consolidado
          oficial SENA) — alimenta el selector de &quot;Competencias / resultados de
          aprendizaje&quot; que el aprendiz usa al diligenciar cada Bitácora.
        </p>
        <CompetenciasPanel />
      </div>
    </div>
  );
}
