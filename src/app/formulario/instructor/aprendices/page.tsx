import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

export default async function InstructorAprendicesPage() {
  const user = await requireUser(["INSTRUCTOR"]);

  // El instructor puede consultar (solo lectura) a cualquier aprendiz, de cualquier ficha, pero
  // solo puede evaluarlo si la ficha del aprendiz lo tiene a él como instructor autorizado.
  const aprendices = await prisma.user.findMany({
    where: { role: "APRENDIZ" },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      email: true,
      estado: true,
      ficha: { select: { id: true, codigo: true, instructorId: true } },
    },
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
  });

  return (
    <div className="flex flex-1 justify-center px-4 py-10">
      <div className="w-full max-w-3xl space-y-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Aprendices
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Puedes consultar a todos los aprendices, pero solo puedes evaluar a los de tus fichas
            asignadas.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {aprendices.length === 0 ? (
            <p className="px-6 py-6 text-sm text-zinc-500 dark:text-zinc-400">
              Todavía no hay aprendices registrados.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {aprendices.map((aprendiz) => {
                const evaluable = aprendiz.ficha?.instructorId === user.id;
                return (
                  <li
                    key={aprendiz.id}
                    className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">
                        {aprendiz.nombres} {aprendiz.apellidos}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {aprendiz.email} · Ficha {aprendiz.ficha?.codigo ?? "sin asignar"}
                      </p>
                    </div>
                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                        evaluable
                          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}
                    >
                      {evaluable ? "Evaluable" : "Solo consulta"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
