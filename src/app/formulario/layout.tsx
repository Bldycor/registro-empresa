import { redirect } from "next/navigation";
import Link from "next/link";
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
    <header className="flex flex-wrap items-center justify-between gap-3 bg-azul px-4 py-3 text-white sm:px-6 print:hidden">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-sena text-sm font-bold text-white"
        >
          SP
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">SEPA</p>
          <p className="text-[11px] text-white/70">SENA · Seguimiento de Etapa Productiva</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-white/80 sm:inline">
          {user.nombres} {user.apellidos}
        </span>
        <Link
          href="/formulario/ayuda"
          className="rounded-md px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10"
        >
          Ayuda
        </Link>
        <LogoutButton />
      </div>
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
                  // Una reunión extraordinaria no aprobada no es una evidencia rechazada: no suma a la insignia.
                  prisma.evaluacion.count({ where: { userId, estado: "RECHAZADA", esExtraordinario: false } }),
                  prisma.certificacionEmpresario.count({ where: { userId, estado: "RECHAZADA" } }),
                ]);
              return { alternativa, formalizacion, bitacoras, evaluaciones, certificacion };
            })(),
            prisma.user.findUnique({
              where: { id: userId },
              select: {
                estado: true,
                fechaInicioEtapaProductiva: true,
                fechaFinEtapaProductiva: true,
                totalBitacoras: true,
                bitacoraInicioTramo: true,
                ficha: { select: { fechaLimiteIniciarEP: true } },
                seleccionesAlternativa: { select: { estado: true }, orderBy: { createdAt: "desc" }, take: 1 },
                formalizacionEtapaProductiva: { select: { estado: true } },
                concertacionFuncion: { select: { estado: true } },
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
                concertacionAprobada: aprendiz.concertacionFuncion?.estado === "APROBADA",
                bitacoras: aprendiz.bitacoras,
                totalBitacoras: aprendiz.totalBitacoras,
                bitacoraInicioTramo: aprendiz.bitacoraInicioTramo,
                estadoAprendiz: aprendiz.estado,
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
      <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950 print:bg-white">
        {header}
        {profile && <EvidenciaEPNav alertas={alertas} />}
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      {header}
      <div className="flex flex-1 flex-col sm:flex-row">
        <PanelSidebar role={user.role} />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
