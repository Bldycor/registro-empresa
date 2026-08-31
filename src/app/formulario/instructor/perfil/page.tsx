import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { PersonalDataForm } from "@/components/personal-data-form";

export const dynamic = "force-dynamic";

export default async function InstructorPerfilPage() {
  const currentUser = await requireUser(["INSTRUCTOR"]);

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: {
      nombres: true,
      apellidos: true,
      cedula: true,
      email: true,
      celular: true,
      direccionResidencia: true,
      fichasAsignadas: { select: { codigo: true }, orderBy: { codigo: "asc" } },
    },
  });

  if (!user) redirect("/login");

  const codigoFicha =
    user.fichasAsignadas.length > 0
      ? user.fichasAsignadas.map((f) => f.codigo).join(", ")
      : "Sin fichas asignadas";

  return (
    <div className="flex flex-1 flex-col items-center gap-8 px-4 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Mi perfil</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Tus datos de contacto — el coordinador administra tus fichas asignadas.
        </p>
      </div>

      <PersonalDataForm
        initialData={{
          nombres: user.nombres,
          apellidos: user.apellidos,
          cedula: user.cedula,
          email: user.email,
          celular: user.celular,
          direccionResidencia: user.direccionResidencia,
          codigoFicha,
        }}
        codigoFichaLabel="Fichas asignadas"
      />
    </div>
  );
}
