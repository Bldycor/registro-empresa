import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-guards";
import { cargarExpediente } from "@/lib/expediente";
import { ExpedienteAprendiz } from "@/components/expediente-aprendiz";
import { BotonVolver } from "@/components/boton-volver";

export const dynamic = "force-dynamic";

// Expediente de un aprendiz para el instructor y Coordinación. Es de solo consulta: el instructor
// puede ver el de cualquier aprendiz, igual que en su lista de Aprendices, aunque solo evalúa a
// los de sus fichas.
export default async function ExpedientePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["INSTRUCTOR", "COORDINADOR", "ADMIN"]);
  // Sin historial (enlace directo), «Volver» lleva a la lista de aprendices de cada rol.
  const listaAprendices =
    user.role === "INSTRUCTOR" ? "/formulario/instructor/aprendices" : "/formulario/coordinador/aprendices";
  const { id } = await params;
  const expediente = await cargarExpediente(id);
  if (!expediente) notFound();

  return (
    <div className="flex flex-1 flex-col px-4 py-8 sm:px-8 print:p-0">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <BotonVolver alternativa={listaAprendices} />
        <ExpedienteAprendiz expediente={expediente} />
        <BotonVolver alternativa={listaAprendices} etiqueta="Volver a la pantalla anterior" />
      </div>
    </div>
  );
}
