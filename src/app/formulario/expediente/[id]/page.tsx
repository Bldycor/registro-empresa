import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { cargarExpediente } from "@/lib/expediente";
import { ExpedienteAprendiz } from "@/components/expediente-aprendiz";

export const dynamic = "force-dynamic";

// Expediente de un aprendiz para el instructor y Coordinación. Es de solo consulta: el instructor
// puede ver el de cualquier aprendiz, igual que en su lista de Aprendices, aunque solo evalúa a
// los de sus fichas.
export default async function ExpedientePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["INSTRUCTOR", "COORDINADOR", "ADMIN"]);
  const { id } = await params;
  const expediente = await cargarExpediente(id);
  if (!expediente) notFound();

  return (
    <div className="flex flex-1 flex-col px-4 py-8 sm:px-8 print:p-0">
      <div className="mx-auto w-full max-w-4xl">
        <ExpedienteAprendiz expediente={expediente} />
      </div>
    </div>
  );
}
