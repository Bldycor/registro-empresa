import { requireUser } from "@/lib/auth-guards";
import { AlternativasEPPanel } from "@/components/alternativas-ep-panel";

export const dynamic = "force-dynamic";

export default async function InstructorAlternativasPage() {
  await requireUser(["INSTRUCTOR"]);

  return (
    <div className="flex flex-1 flex-col px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Alternativas EP
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Revisa y avala las solicitudes de selección/modificación de alternativa (GFPI-F-165) de
          los aprendices de tus fichas asignadas.
        </p>
        <AlternativasEPPanel
          listUrl="/api/instructor/alternativas"
          patchUrlBase="/api/instructor/alternativas"
        />
      </div>
    </div>
  );
}
