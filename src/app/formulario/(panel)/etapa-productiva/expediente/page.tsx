import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { cargarExpediente } from "@/lib/expediente";
import { ExpedienteAprendiz } from "@/components/expediente-aprendiz";

export const dynamic = "force-dynamic";

// El aprendiz consulta su propio expediente, el mismo que ven su instructor y Coordinación.
export default async function MiExpedientePage() {
  const user = await requireUser(["APRENDIZ"]);
  const expediente = await cargarExpediente(user.id);
  if (!expediente) notFound();

  return (
    <div className="flex flex-1 flex-col px-4 py-8 sm:px-8 print:p-0">
      <div className="mx-auto w-full max-w-4xl">
        <ExpedienteAprendiz expediente={expediente} propio />
      </div>
    </div>
  );
}
