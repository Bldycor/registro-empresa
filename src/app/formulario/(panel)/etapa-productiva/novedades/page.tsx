import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { NovedadesEP } from "@/components/novedades-ep";

export const dynamic = "force-dynamic";

// Novedades de la etapa productiva del aprendiz (guía GFPI-G-040 §9.2).
export default async function NovedadesPage() {
  const user = await requireUser(["APRENDIZ"]);
  const aprendiz = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totalBitacoras: true },
  });

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-4 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Novedades</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Cualquier hecho que afecte el desarrollo de tu etapa productiva —cambio de coformador, de
          funciones o de sede, un accidente, una incapacidad corta, un problema con la ARL—.
          Repórtalo dentro de los <strong>3 días hábiles</strong> siguientes y déjalo anotado en tu
          bitácora dentro de los <strong>5 días hábiles</strong>. Si la novedad te impide seguir,
          usa «Alternativa EP»: ahí se piden el aplazamiento y la interrupción, que también
          aparecen en esta lista.
        </p>
      </div>

      <div className="w-full max-w-2xl">
        <NovedadesEP totalBitacoras={aprendiz?.totalBitacoras ?? 12} />
      </div>
    </div>
  );
}
