import { requireUser } from "@/lib/auth-guards";
import { InterrupcionesEPPanel } from "@/components/interrupciones-ep-panel";

export const dynamic = "force-dynamic";

export default async function InterrupcionesEPPage() {
  await requireUser(["COORDINADOR", "ADMIN"]);

  return (
    <div className="flex flex-1 flex-col px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Interrupciones de Etapa Productiva
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Aprendices que no pudieron terminar la práctica con la alternativa que tenían. Al avalar
          la interrupción, el tiempo ya cumplido queda contabilizado y se descuenta del tramo
          siguiente cuando el aprendiz retome con otra alternativa (guía GFPI-G-040 §9.3.1).
        </p>
        <InterrupcionesEPPanel />
      </div>
    </div>
  );
}
