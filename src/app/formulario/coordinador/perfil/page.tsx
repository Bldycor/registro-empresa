import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { PersonalDataForm } from "@/components/personal-data-form";
import { coordinacionLabel } from "@/lib/validations";

export const dynamic = "force-dynamic";

// Compartida por Coordinador y Admin — mismo patrón que el resto de páginas de este panel
// (fichas, instructores, aprendices, alternativas, competencias), reutilizadas tal cual para
// Admin en vez de duplicarlas.
export default async function CoordinadorPerfilPage() {
  const currentUser = await requireUser(["COORDINADOR", "ADMIN"]);

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: {
      nombres: true,
      apellidos: true,
      cedula: true,
      email: true,
      celular: true,
      direccionResidencia: true,
      coordinacion: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col items-center gap-8 px-4 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Mi perfil</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Tus datos de contacto — el administrador gestiona tu coordinación asignada.
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
          codigoFicha: user.coordinacion ? coordinacionLabel[user.coordinacion] : "Sin asignar",
        }}
        codigoFichaLabel="Coordinación"
      />
    </div>
  );
}
