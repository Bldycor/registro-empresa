import { requireUser } from "@/lib/auth-guards";
import { PlanesMejoramientoCoordinacion } from "@/components/planes-mejoramiento-coordinacion";

export const dynamic = "force-dynamic";

// Autorización de los planes de mejoramiento (guía GFPI-G-040 §9.4).
export default async function CoordinadorPlanesPage() {
  await requireUser(["COORDINADOR", "ADMIN"]);

  return (
    <div className="flex flex-1 flex-col px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Planes de mejoramiento
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          El reglamento del aprendiz (Acuerdo 009) pide que el plan lo firmen el aprendiz y el
          coordinador académico: tu autorización es esa firma. Al autorizarlo arranca el plazo que
          fijó el instructor —máximo 20 días calendario— y le llega la comunicación escrita al
          aprendiz. No requiere acta del Comité.
        </p>
        <PlanesMejoramientoCoordinacion />
      </div>
    </div>
  );
}
