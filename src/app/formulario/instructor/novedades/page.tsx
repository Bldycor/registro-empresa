import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { NovedadesPanel } from "@/components/novedades-panel";

export const dynamic = "force-dynamic";

// Novedades de los aprendices de las fichas del instructor (guía GFPI-G-040 §9.2).
export default async function InstructorNovedadesPage() {
  const user = await requireUser(["INSTRUCTOR"]);

  const aprendices = await prisma.user.findMany({
    where: { role: "APRENDIZ", ficha: { instructorId: user.id } },
    select: { id: true, nombres: true, apellidos: true },
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
  });

  return (
    <div className="flex flex-1 flex-col px-4 py-10 sm:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Novedades</h1>
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          Hechos que afectan el desarrollo de la etapa productiva de tus aprendices. La guía pide
          registrarlos dentro de los 3 días hábiles y anotarlos en la bitácora dentro de los 5; aquí
          ves si se cumplió. Los aplazamientos y las interrupciones también aparecen, con su plazo
          de registro.
        </p>
        <NovedadesPanel
          aprendices={aprendices.map((a) => ({ id: a.id, nombre: `${a.nombres} ${a.apellidos}` }))}
        />
      </div>
    </div>
  );
}
