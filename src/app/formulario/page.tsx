import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CompanyProfileForm } from "@/components/company-profile-form";
import { alternativaEtapaProductivaLabel } from "@/lib/validations";

export const dynamic = "force-dynamic";

export default async function FormularioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      nombres: true,
      apellidos: true,
      cedula: true,
      alternativaEtapaProductiva: true,
      ficha: { select: { codigo: true, programa: true } },
    },
  });
  if (!user) redirect("/login");

  // El proceso de "información de la empresa" solo aplica a Aprendices. Instructor/Coordinador/
  // Admin tienen su propio panel: aprendices en consulta, gestión de fichas o de coordinadores.
  if (user.role === "INSTRUCTOR") {
    redirect("/formulario/instructor/aprendices");
  }
  if (user.role === "COORDINADOR") {
    redirect("/formulario/coordinador/fichas");
  }
  if (user.role === "ADMIN") {
    redirect("/formulario/admin/coordinadores");
  }

  const profile = await prisma.companyProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (profile) {
    redirect("/formulario/actualizar");
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-4 py-10">
      {/* Confirma al aprendiz recién migrado que su registro (ficha, programa, alternativa) ya
          está enlazado correctamente — antes de esto la primera pantalla que veía no mostraba
          ningún dato suyo, lo cual se leía como "no se migró la información". */}
      <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Hola, {user.nombres} {user.apellidos}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            CC {user.cedula}
          </span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            Ficha {user.ficha?.codigo ?? "sin asignar"}
          </span>
          {user.ficha?.programa && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {user.ficha.programa}
            </span>
          )}
          {user.alternativaEtapaProductiva && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {alternativaEtapaProductivaLabel[user.alternativaEtapaProductiva]}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Este es tu registro — solo falta completar la información de tu empresa para continuar.
        </p>
      </div>

      <CompanyProfileForm mode="create" />
    </div>
  );
}
