import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { AprendizCreatePanel } from "@/components/aprendiz-create-panel";
import { InstructorAprendicesPanel } from "@/components/instructor-aprendices-panel";

export const dynamic = "force-dynamic";

export default async function InstructorAprendicesPage() {
  const user = await requireUser(["INSTRUCTOR"]);

  // El instructor puede consultar (solo lectura) a cualquier aprendiz, de cualquier ficha, pero
  // solo puede evaluarlo si la ficha del aprendiz lo tiene a él como instructor autorizado.
  const [aprendices, fichasAsignadas] = await Promise.all([
    prisma.user.findMany({
      where: { role: "APRENDIZ" },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        cedula: true,
        email: true,
        estado: true,
        ficha: { select: { id: true, codigo: true, instructorId: true } },
      },
      orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
    }),
    prisma.ficha.findMany({
      where: { instructorId: user.id },
      select: { id: true, codigo: true },
      orderBy: { codigo: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-1 justify-center px-4 py-10">
      <div className="w-full max-w-3xl space-y-8">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Aprendices
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Puedes consultar a todos los aprendices, pero solo puedes evaluar y crear cuentas en
            tus fichas asignadas.
          </p>
        </div>

        <AprendizCreatePanel
          fichas={fichasAsignadas}
          createUrl="/api/instructor/aprendices"
          importUrl="/api/instructor/aprendices/import"
          sinFichasMensaje="No tienes fichas asignadas todavía."
          restriccionFichaTexto="la ficha no es tuya"
        />

        <InstructorAprendicesPanel aprendices={aprendices} fichasAsignadas={fichasAsignadas} />
      </div>
    </div>
  );
}
