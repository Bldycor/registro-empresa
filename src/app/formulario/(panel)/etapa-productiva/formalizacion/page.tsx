import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { FormalizacionForm } from "@/components/formalizacion-form";

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

export default async function FormalizacionPage() {
  const currentUser = await requireUser(["APRENDIZ"]);

  const formalizacion = await prisma.formalizacionEtapaProductiva.findUnique({
    where: { userId: currentUser.id },
  });

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-4 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Formalización de la Etapa Productiva
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Carta de vínculo laboral, contrato laboral, carta de pasantía u otro documento
          certificador — se diligencia antes de tu fecha de inicio de Etapa Productiva.
        </p>
      </div>

      {formalizacion && (
        <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {formalizacion.tipoDocumento}
            </p>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoStyles[formalizacion.estado]}`}
            >
              {estadoText[formalizacion.estado]}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {formalizacion.fecha.toLocaleDateString("es-CO", { timeZone: "UTC" })}
          </p>
          {formalizacion.observaciones && (
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
              Observaciones del instructor: {formalizacion.observaciones}
            </p>
          )}
        </div>
      )}

      <FormalizacionForm
        initial={
          formalizacion
            ? {
                tipoDocumento: formalizacion.tipoDocumento,
                fecha: formalizacion.fecha.toISOString().slice(0, 10),
                archivoUrl: formalizacion.archivoUrl ?? "",
              }
            : null
        }
      />
    </div>
  );
}
