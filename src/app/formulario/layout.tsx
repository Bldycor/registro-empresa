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

  // Mismo encabezado para los 4 roles — antes solo lo veían Instructor/Coordinador/Admin; un
  // Aprendiz recién migrado entraba a una pantalla sin ningún dato suyo visible (ni su nombre),
  // lo que parecía "no se migraron sus datos" aunque el registro sí existiera correctamente.
  const header = (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        Sesión iniciada como{" "}
        <strong>
          {user.nombres} {user.apellidos}
        </strong>
      </span>
      <LogoutButton />
    </header>
  );

  if (user.role === "APRENDIZ") {
    const profile = await prisma.companyProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    // Cuenta de evidencias Rechazadas por sección, para la insignia roja del nav — solo hace
    // falta calcularla si ya hay nav que mostrar (perfil completo).
    const rechazos = profile
      ? await (async () => {
          const userId = session.user.id;
          const [alternativa, formalizacion, bitacoras, evaluaciones, certificacion] =
            await Promise.all([
              prisma.seleccionAlternativaEP.count({ where: { userId, estado: "RECHAZADA" } }),
              prisma.formalizacionEtapaProductiva.count({ where: { userId, estado: "RECHAZADA" } }),
              prisma.bitacora.count({ where: { userId, estado: "RECHAZADA" } }),
              prisma.evaluacion.count({ where: { userId, estado: "RECHAZADA" } }),
              prisma.certificacionEmpresario.count({ where: { userId, estado: "RECHAZADA" } }),
            ]);
          return { alternativa, formalizacion, bitacoras, evaluaciones, certificacion };
        })()
      : undefined;

    // Antes de completar el perfil de empresa no hay nada más que navegar — la única pantalla
    // disponible es /formulario (el propio formulario de perfil), así que no se muestra el nav.
    return (
      <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
        {header}
        {profile && <EvidenciaEPNav rechazos={rechazos} />}
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      {header}
      <div className="flex flex-1 flex-col sm:flex-row">
        <PanelSidebar role={user.role} />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
