import { requireUser } from "@/lib/auth-guards";
import { ExtraordinariasPanel } from "@/components/extraordinarias-panel";

export const dynamic = "force-dynamic";

export default async function InstructorExtraordinariasPage() {
  await requireUser(["INSTRUCTOR"]);

  return (
    <div className="flex flex-1 flex-col px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Reuniones extraordinarias
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Reuniones adicionales que piden tus aprendices —o sus coformadores— cuando surge un problema
          o una eventualidad. Al aprobar una, la citación con el enlace les llega a todos; si no la
          apruebas, el aprendiz recibe tu nota y puede proponer otra fecha.
        </p>
        <ExtraordinariasPanel />
      </div>
    </div>
  );
}
