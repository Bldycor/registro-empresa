import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { PlanesMejoramientoPanel } from "@/components/planes-mejoramiento-panel";

export const dynamic = "force-dynamic";

// Planes de mejoramiento de los aprendices de las fichas del instructor (guía GFPI-G-040 §9.4).
export default async function InstructorPlanesPage() {
  const user = await requireUser(["INSTRUCTOR"]);

  const aprendices = await prisma.user.findMany({
    where: { role: "APRENDIZ", ficha: { instructorId: user.id } },
    select: { id: true, nombres: true, apellidos: true },
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
  });

  return (
    <div className="flex flex-1 flex-col px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Planes de mejoramiento
        </h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Medida formativa cuando un aprendiz no supera resultados de aprendizaje en alguno de los
          tres Momentos, agotados los dos llamados de atención previos (reglamento del aprendiz,
          Acuerdo 009). Tú lo redactas y lo verificas; la coordinación académica lo autoriza y se lo
          comunica al aprendiz. Máximo 20 días calendario desde esa autorización, y nunca más allá
          del fin de la etapa productiva. Un plan sin cerrar o no cumplido advierte, pero no impide
          certificar.
        </p>
        <PlanesMejoramientoPanel
          aprendices={aprendices.map((a) => ({ id: a.id, nombre: `${a.nombres} ${a.apellidos}` }))}
        />
      </div>
    </div>
  );
}
