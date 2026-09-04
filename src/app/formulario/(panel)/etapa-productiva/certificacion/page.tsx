import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { CertificacionForm } from "@/components/certificacion-form";
import { VENTANA_CERTIFICACION_DIAS } from "@/lib/validations";

export const dynamic = "force-dynamic";

const estadoStyles: Record<string, string> = {
  PENDIENTE: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400",
  APROBADA: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400",
  RECHAZADA: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400",
};
const estadoText: Record<string, string> = {
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
};

function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * 24 * 60 * 60 * 1000);
}

function aFechaInput(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export default async function CertificacionPage() {
  const currentUser = await requireUser(["APRENDIZ"]);

  const [user, certificacion] = await Promise.all([
    prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { fechaFinEtapaProductiva: true },
    }),
    prisma.certificacionEmpresario.findUnique({ where: { userId: currentUser.id } }),
  ]);

  if (!user) redirect("/login");

  const fechaFinEP = user.fechaFinEtapaProductiva;
  const fechaMin = fechaFinEP ? aFechaInput(sumarDias(fechaFinEP, -VENTANA_CERTIFICACION_DIAS)) : undefined;
  const fechaMax = fechaFinEP ? aFechaInput(sumarDias(fechaFinEP, VENTANA_CERTIFICACION_DIAS)) : undefined;

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-4 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Certificación del Empresario
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Carta de certificación a satisfacción del empresario, al cierre de tu Etapa Productiva.
        </p>
      </div>

      {fechaFinEP ? (
        <div className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/40 dark:text-zinc-400">
          Tu Etapa Productiva termina el {fechaFinEP.toLocaleDateString("es-CO", { timeZone: "UTC" })}.
          Puedes datar tu carta de certificación entre el{" "}
          {fechaMin && new Date(fechaMin).toLocaleDateString("es-CO", { timeZone: "UTC" })} y el{" "}
          {fechaMax && new Date(fechaMax).toLocaleDateString("es-CO", { timeZone: "UTC" })}.
        </div>
      ) : (
        <div className="w-full max-w-2xl rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
          Aún no tienes una fecha de fin de Etapa Productiva registrada — se define al aprobarse
          tu Alternativa EP. Puedes enviar tu carta igual, sin restricción de fecha por ahora.
        </div>
      )}

      {certificacion && (
        <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Carta de certificación
            </p>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[certificacion.estado]}`}
            >
              {estadoText[certificacion.estado]}
            </span>
          </div>
          {certificacion.fecha && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {certificacion.fecha.toLocaleDateString("es-CO", { timeZone: "UTC" })}
            </p>
          )}
          {certificacion.observaciones && (
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              Observaciones del instructor: {certificacion.observaciones}
            </p>
          )}
        </div>
      )}

      <CertificacionForm
        initial={
          certificacion
            ? {
                fecha: certificacion.fecha ? certificacion.fecha.toISOString().slice(0, 10) : "",
                archivoUrl: certificacion.archivoUrl ?? "",
              }
            : null
        }
        fechaMin={fechaMin}
        fechaMax={fechaMax}
      />
    </div>
  );
}
