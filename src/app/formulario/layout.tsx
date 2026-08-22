import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/logout-button";
import { PanelSidebar } from "@/components/panel-sidebar";
import { EvidenciaEPNav } from "@/components/evidencia-ep-nav";

export default async function FormularioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, nombres: true, apellidos: true },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.role === "APRENDIZ") {
    const profile = await prisma.companyProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    // Antes de completar el perfil de empresa no hay nada más que navegar — la única pantalla
    // disponible es /formulario (el propio formulario de perfil), así que no se muestra el nav.
    return (
      <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
        {profile && <EvidenciaEPNav />}
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          Sesión iniciada como{" "}
          <strong>
            {user.nombres} {user.apellidos}
          </strong>
        </span>
        <LogoutButton />
      </header>
      <div className="flex flex-1 flex-col sm:flex-row">
        <PanelSidebar role={user.role} />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
