import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SeleccionAlternativaForm } from "@/components/seleccion-alternativa-form";
import { comunaLabel, alternativaEtapaProductivaLabel } from "@/lib/validations";

export const dynamic = "force-dynamic";

export default async function AlternativaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, selecciones] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        nombres: true,
        apellidos: true,
        cedula: true,
        comuna: true,
        alternativaEtapaProductiva: true,
        fechaInicioEtapaProductiva: true,
        fechaFinEtapaProductiva: true,
        ficha: { select: { codigo: true, instructor: { select: { nombres: true, apellidos: true } } } },
      },
    }),
    prisma.seleccionAlternativaEP.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        tipoSolicitud: true,
        alternativa: true,
        subtipoAlternativa: true,
        fechaInicioEjecucion: true,
        fechaFinEjecucion: true,
        estado: true,
        observacionesAval: true,
        createdAt: true,
      },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col items-center gap-8 px-4 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Selección / Modificación de Alternativa
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Formato institucional GFPI-F-165. Diligéncialo antes de iniciar tu Etapa Productiva; si
          la alternativa cambia después, envía una modificación.
        </p>
      </div>

      <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Tus datos (ya registrados)
        </p>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Info label="Nombre" value={`${user.nombres} ${user.apellidos}`} />
          <Info label="Cédula" value={user.cedula} />
          <Info label="Comuna" value={user.comuna ? comunaLabel[user.comuna] : "—"} />
          <Info label="Ficha" value={user.ficha?.codigo ?? "Sin asignar"} />
          <Info
            label="Instructor de seguimiento"
            value={
              user.ficha?.instructor
                ? `${user.ficha.instructor.nombres} ${user.ficha.instructor.apellidos}`
                : "Sin asignar"
            }
          />
          <Info
            label="Alternativa vigente"
            value={
              user.alternativaEtapaProductiva
                ? alternativaEtapaProductivaLabel[user.alternativaEtapaProductiva]
                : "Aún no definida"
            }
          />
        </dl>
      </div>

      <SeleccionAlternativaForm tieneAlternativaVigente={Boolean(user.alternativaEtapaProductiva)} />

      {selecciones.length > 0 && (
        <div className="w-full max-w-2xl">
          <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Historial de solicitudes
          </p>
          <ul className="space-y-2">
            {selecciones.map((s) => (
              <li
                key={s.id}
                className="rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {alternativaEtapaProductivaLabel[s.alternativa]}
                  </span>
                  <EstadoBadge estado={s.estado} />
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {s.tipoSolicitud === "SELECCION" ? "Selección" : "Modificación"} · enviado el{" "}
                  {s.createdAt.toLocaleDateString("es-CO", { timeZone: "UTC" })}
                </p>
                {s.observacionesAval && (
                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                    Observaciones: {s.observacionesAval}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="font-medium text-zinc-900 dark:text-zinc-50">{value}</dd>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const styles: Record<string, string> = {
    PENDIENTE: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400",
    APROBADA: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400",
    RECHAZADA: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
  };
  const text: Record<string, string> = {
    PENDIENTE: "Pendiente",
    APROBADA: "Aprobada",
    RECHAZADA: "Rechazada",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[estado] ?? ""}`}>
      {text[estado] ?? estado}
    </span>
  );
}
