import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CompanyProfileForm } from "@/components/company-profile-form";

export const dynamic = "force-dynamic";

export default async function FormularioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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
