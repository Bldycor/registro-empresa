import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CompanyProfileForm } from "@/components/company-profile-form";
import { RolePlaceholderPanel } from "@/components/role-placeholder-panel";

export const dynamic = "force-dynamic";

export default async function FormularioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!user) redirect("/login");

  // El proceso de "información de la empresa" solo aplica a Aprendices. Instructor/Coordinador
  // aún no tienen su panel construido (llega en la siguiente fase); se les muestra un aviso claro
  // en lugar del formulario de empresa, que no les corresponde.
  if (user.role !== "APRENDIZ") {
    return (
      <div className="flex flex-1 justify-center px-4 py-10">
        <RolePlaceholderPanel role={user.role} />
      </div>
    );
  }

  const profile = await prisma.companyProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (profile) {
    redirect("/formulario/actualizar");
  }

  return (
    <div className="flex flex-1 justify-center px-4 py-10">
      <CompanyProfileForm mode="create" />
    </div>
  );
}
