import { requireUser } from "@/lib/auth-guards";
import { rechazosSinAvisar } from "@/lib/avisos-rechazo-pendientes";
import { EnviarAvisosRechazo } from "@/components/enviar-avisos-rechazo";

export const dynamic = "force-dynamic";

// Envío único del aviso de rechazo (10 nov 2026): lista las evidencias que hoy están rechazadas y
// todavía no tienen aviso por correo, y las envía cuando Coordinación lo confirma.
export default async function AvisosRechazoPage() {
  await requireUser(["COORDINADOR", "ADMIN"]);
  const pendientes = await rechazosSinAvisar();

  return (
    <div className="flex flex-1 flex-col px-4 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Avisos de evidencias rechazadas</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Evidencias que hoy están rechazadas y aún no tienen aviso por correo. Al enviar, cada aprendiz recibe el
            aviso con copia a su instructor y a su coformador. Las que ya se avisaron no se repiten.
          </p>
        </div>
        <EnviarAvisosRechazo cantidad={pendientes.length} />
        {pendientes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No hay evidencias rechazadas sin avisar.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {pendientes.map((p, i) => (
              <li key={i} className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {p.aprendiz} · {p.nombre}
                </p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Observación: {p.observacion ?? "sin observación registrada"}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Se envía a: {p.destinatarios.join(", ")}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
