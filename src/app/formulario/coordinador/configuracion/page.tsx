import { requireUser } from "@/lib/auth-guards";
import { ConfiguracionCentroForm } from "@/components/configuracion-centro-form";

export const dynamic = "force-dynamic";

// Parámetros del centro que alimentan el formato GFPI-F-023 de todos los aprendices.
export default async function ConfiguracionCentroPage() {
  await requireUser(["COORDINADOR", "ADMIN"]);

  return (
    <div className="flex flex-1 flex-col px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Datos del centro
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          El encabezado del formato GFPI-F-023 pide la regional, el centro de formación y la
          estrategia formativa, y son los mismos para todos los aprendices. Escríbelos una vez aquí
          y entrarán solos en los tres momentos de evaluación, sin que el aprendiz los teclee.
        </p>
        <ConfiguracionCentroForm />
      </div>
    </div>
  );
}
