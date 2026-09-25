import { requireUser } from "@/lib/auth-guards";
import { guiaDelRol } from "@/lib/ayuda";

export const dynamic = "force-dynamic";

// Guía de uso del SEPA, distinta para cada rol (ver src/lib/ayuda.ts).
export default async function AyudaPage() {
  const user = await requireUser();
  const guia = guiaDelRol(user.role);

  return (
    <div className="flex flex-1 flex-col px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-sena">Guía de uso</p>
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {guia.rol}
        </h1>
        <p className="mb-8 text-base text-zinc-600 dark:text-zinc-300">{guia.resumen}</p>

        <div className="flex flex-col gap-6">
          {guia.secciones.map((seccion) => (
            <section
              key={seccion.titulo}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h2 className="mb-3 border-b border-zinc-100 pb-2 text-sm font-semibold uppercase tracking-wide text-sena dark:border-zinc-800">
                {seccion.titulo}
              </h2>
              <dl className="flex flex-col gap-4">
                {seccion.opciones.map((o) => (
                  <div key={o.opcion}>
                    <dt className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{o.opcion}</dt>
                    <dd className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{o.que}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}

          <section className="rounded-xl border border-sena/30 bg-sena-claro p-5 dark:border-sena/40 dark:bg-emerald-900/20">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
              Para tener en cuenta
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
              {guia.consejos.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
