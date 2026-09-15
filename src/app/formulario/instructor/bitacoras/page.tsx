import { requireUser } from "@/lib/auth-guards";
import { BitacorasPanel } from "@/components/bitacoras-panel";
import { PlantillaEnlace, PLANTILLA_BITACORA } from "@/components/plantilla-enlace";

export const dynamic = "force-dynamic";

export default async function InstructorBitacorasPage() {
  await requireUser(["INSTRUCTOR"]);

  return (
    <div className="flex flex-1 flex-col px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Bitácoras de Etapa Productiva
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Revisa y avala las bitácoras quincenales de los aprendices de tus fichas asignadas.
        </p>
        <div className="-mt-4 mb-6">
          <PlantillaEnlace plantilla={PLANTILLA_BITACORA} />
        </div>
        <BitacorasPanel />
      </div>
    </div>
  );
}
