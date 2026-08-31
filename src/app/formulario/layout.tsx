import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/logout-button";
import { PanelSidebar } from "@/components/panel-sidebar";
import { EvidenciaEPNav } from "@/components/evidencia-ep-nav";
import { calcularSeguimiento } from "@/lib/seguimiento-evidencias";

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

    // Insignia roja del nav: cuenta evidencias Rechazadas + evidencias Atrasadas (vencidas según
    // su propia fecha real de inicio/fin de EP — mismo cálculo que el panel de Seguimiento del
    // instructor, ver src/lib/seguimiento-evidencias.ts) por sección. Solo hace falta calcularla
    // si ya hay nav que mostrar (perfil completo).
    const alertas = profile
      ? await (async () => {
          const userId = session.user.id;
          const [rechazos, aprendiz] = await Promise.all([
            (async () => {
              const [alternativa, formalizacion, bitacoras, evaluaciones, certificacion] =
                await Promise.all([
                  prisma.seleccionAlternativaEP.count({ where: { userId, estado: "RECHAZADA" } }),
                  prisma.formalizacionEtapaProductiva.count({ where: { userId, estado: "RECHAZADA" } }),
                  prisma.bitacora.count({ where: { userId, estado: "RECHAZADA" } }),
                  prisma.evaluacion.count({ where: { userId, estado: "RECHAZADA" } }),
                  prisma.certificacionEmpresario.count({ where: { userId, estado: "RECHAZADA" } }),
                ]);
              return { alternativa, formalizacion, bitacoras, evaluaciones, certificacion };
            })(),
            prisma.user.findUnique({
              where: { id: userId },
              select: {
                fechaInicioEtapaProductiva: true,
                fechaFinEtapaProductiva: true,
                ficha: { select: { fechaLimiteIniciarEP: true } },
                seleccionesAlternativa: { select: { estado: true }, orderBy: { createdAt: "desc" }, take: 1 },
                formalizacionEtapaProductiva: { select: { estado: true } },
                concertacionFuncion: { select: { fecha: true } },
                bitacoras: { select: { numero: true, estado: true } },
                evaluaciones: {
                  where: { numero: { in: [2, 3] }, esExtraordinario: false },
                  select: { numero: true, estado: true },
                },
                certificacionEmpresario: { select: { estado: true } },
              },
            }),
          ]);

          const checklist = aprendiz
            ? calcularSeguimiento({
                hoy: new Date(),
                fechaInicioEP: aprendiz.fechaInicioEtapaProductiva,
                fechaFinEP: aprendiz.fechaFinEtapaProductiva,
                fechaLimiteIniciarEPFicha: aprendiz.ficha?.fechaLimiteIniciarEP ?? null,
                alternativaAprobada: aprendiz.seleccionesAlternativa[0]?.estado === "APROBADA",
                formalizacionAprobada: aprendiz.formalizacionEtapaProductiva?.estado === "APROBADA",
                concertacionFecha: aprendiz.concertacionFuncion?.fecha ?? null,
                bitacoras: aprendiz.bitacoras,
                evaluacion2Aprobada: aprendiz.evaluaciones.some((e) => e.numero === 2 && e.estado === "APROBADA"),
                evaluacion3Aprobada: aprendiz.evaluaciones.some((e) => e.numero === 3 && e.estado === "APROBADA"),
                certificacionAprobada: aprendiz.certificacionEmpresario?.estado === "APROBADA",
              })
            : [];

          const porClave = Object.fromEntries(checklist.map((c) => [c.clave, c.cantidadAtrasada]));

          return {
            alternativa: rechazos.alternativa + (porClave.alternativa ?? 0),
            formalizacion: rechazos.formalizacion + (porClave.formalizacion ?? 0),
            bitacoras: rechazos.bitacoras + (porClave.bitacoras ?? 0),
            evaluaciones: rechazos.evaluaciones + (porClave.concertacion ?? 0) + (porClave.evaluaciones ?? 0),
            certificacion: rechazos.certificacion + (porClave.certificacion ?? 0),
          };
        })()
      : undefined;

    // Antes de completar el perfil de empresa no hay nada más que navegar — la única pantalla
    // disponible es /formulario (el propio formulario de perfil), así que no se muestra el nav.
    return (
      <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
        {header}
        {profile && <EvidenciaEPNav alertas={alertas} />}
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
