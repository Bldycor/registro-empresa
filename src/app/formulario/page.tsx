import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CompanyProfileForm } from "@/components/company-profile-form";

export const dynamic = "force-dynamic";

export default async function FormularioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
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
    <div className="flex flex-1 justify-center px-4 py-10">
      <CompanyProfileForm mode="create" />
    </div>
  );
}
