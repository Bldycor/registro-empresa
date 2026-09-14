import { requireUser } from "@/lib/auth-guards";
import { AplazamientosEPPanel } from "@/components/aplazamientos-ep-panel";

export const dynamic = "force-dynamic";

export default async function AplazamientosEPPage() {
  await requireUser(["COORDINADOR", "ADMIN"]);

  return (
    <div className="flex flex-1 flex-col px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Aplazamientos de Etapa Productiva
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Novedades que suspenden la práctica sin terminarla —maternidad, incapacidad, vacaciones
          colectivas, cese de actividad, fuerza mayor— y que autoriza el Comité de Evaluación y
          Seguimiento (guía GFPI-G-040 §9.3). Registra aquí el acta con la que el Comité decidió; al
          reanudar, las fechas se recalculan con el tiempo que le faltaba al aprendiz.
        </p>
        <AplazamientosEPPanel />
      </div>
    </div>
  );
}
