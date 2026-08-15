import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CompanyProfileForm } from "@/components/company-profile-form";
import { PersonalDataForm } from "@/components/personal-data-form";

export const dynamic = "force-dynamic";

export default async function ActualizarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [profile, user] = await Promise.all([
    prisma.companyProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        nombres: true,
        apellidos: true,
        cedula: true,
        codigoFicha: true,
        email: true,
        celular: true,
        direccionResidencia: true,
      },
    }),
  ]);

  if (!profile) {
    redirect("/formulario");
  }

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-8 px-4 py-10">
      <PersonalDataForm initialData={user} />
      <CompanyProfileForm
        mode="update"
        defaultValues={{
          empresaPatrocinadora: profile.empresaPatrocinadora,
          direccionEmpresa: profile.direccionEmpresa,
          nombreCoformador: profile.nombreCoformador,
          cargoCoformador: profile.cargoCoformador,
          correoCoformador: profile.correoCoformador,
          celularCoformador: profile.celularCoformador,
        }}
      />
    </div>
  );
}
