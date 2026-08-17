import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/logout-button";
import { PanelSidebar } from "@/components/panel-sidebar";
import { buildFase0Steps, type ProcesoStep } from "@/lib/etapa-productiva-steps";

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
    select: { role: true },
  });

  if (!user) {
    redirect("/login");
  }

  // El menú de pasos (Datos de empresa → Concertación) solo aplica al proceso del Aprendiz.
  // Instructor/Coordinador todavía no tienen procesos propios en Fase 0 (llegan en la siguiente fase).
  let steps: ProcesoStep[] = [];
  if (user.role === "APRENDIZ") {
    const [profile, concertacion] = await Promise.all([
      prisma.companyProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      }),
      prisma.concertacionFuncion.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      }),
    ]);

    steps = buildFase0Steps({
      profileCompleto: Boolean(profile),
      concertacionCompleta: Boolean(concertacion),
    });
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          Sesión iniciada como <strong>{session.user.email}</strong>
        </span>
        <LogoutButton />
      </header>
      <div className="flex flex-1 flex-col sm:flex-row">
        <PanelSidebar steps={steps} role={user.role} />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
