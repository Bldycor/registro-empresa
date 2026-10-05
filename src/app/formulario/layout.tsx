import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/logout-button";
import { PanelSidebar } from "@/components/panel-sidebar";
import { EvidenciaEPNav } from "@/components/evidencia-ep-nav";
import { BienvenidaSplash } from "@/components/bienvenida-splash";
import { bienvenidaRol } from "@/lib/ayuda";
import { calcularSeguimiento } from "@/lib/seguimiento-evidencias";
import { pendientesMenu } from "@/lib/pendientes-menu";

export default async function FormularioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Una sola consulta trae lo del encabezado y, si es aprendiz, todo lo que necesita su insignia
  // roja (antes eran cuatro viajes seguidos a la base en cada pantalla).
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      nombres: true,
      apellidos: true,
      companyProfile: { select: { id: true } },
      estado: true,
      fechaInicioEtapaProductiva: true,
      fechaFinEtapaProductiva: true,
      totalBitacoras: true,
      bitacoraInicioTramo: true,
      ficha: { select: { fechaLimiteIniciarEP: true } },
      seleccionesAlternativa: { select: { estado: true }, orderBy: { createdAt: "desc" } },
      formalizacionEtapaProductiva: { select: { estado: true } },
      concertacionFuncion: { select: { estado: true } },
      bitacoras: { select: { numero: true, estado: true } },
      evaluaciones: { where: { esExtraordinario: false }, select: { numero: true, estado: true } },
      certificacionEmpresario: { select: { estado: true } },
    },
  });

  if (!user) {
    redirect("/login");
  }

  // Mismo encabezado para los 4 roles — antes solo lo veían Instructor/Coordinador/Admin; un
  // Aprendiz recién migrado entraba a una pantalla sin ningún dato suyo visible (ni su nombre),
  // lo que parecía "no se migraron sus datos" aunque el registro sí existiera correctamente.
  const header = (
    <header className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-azul via-azul to-azul-claro px-4 py-3 text-white shadow-sm sm:px-6 print:hidden">
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
    const profile = user.companyProfile;

    // Insignia roja del nav: cuenta evidencias Rechazadas + evidencias Atrasadas (vencidas según
    // su propia fecha real de inicio/fin de EP — mismo cálculo que el panel de Seguimiento del
    // instructor, ver src/lib/seguimiento-evidencias.ts) por sección. Solo hace falta calcularla
    // si ya hay nav que mostrar (perfil completo).
    const alertas = profile
      ? (() => {
          const rechazada = (e: { estado: string } | null | undefined) => (e?.estado === "RECHAZADA" ? 1 : 0);
          const momentos = user.evaluaciones.filter((e) => e.numero === 2 || e.numero === 3);
          const rechazos = {
            alternativa: user.seleccionesAlternativa.filter((s) => s.estado === "RECHAZADA").length,
            formalizacion: rechazada(user.formalizacionEtapaProductiva),
            bitacoras: user.bitacoras.filter((b) => b.estado === "RECHAZADA").length,
            // Una reunión extraordinaria no aprobada no es una evidencia rechazada: no suma a la insignia.
            evaluaciones: user.evaluaciones.filter((e) => e.estado === "RECHAZADA").length,
            certificacion: rechazada(user.certificacionEmpresario),
          };

          const checklist = calcularSeguimiento({
            hoy: new Date(),
            fechaInicioEP: user.fechaInicioEtapaProductiva,
            fechaFinEP: user.fechaFinEtapaProductiva,
            fechaLimiteIniciarEPFicha: user.ficha?.fechaLimiteIniciarEP ?? null,
            alternativaAprobada: user.seleccionesAlternativa[0]?.estado === "APROBADA",
            formalizacionAprobada: user.formalizacionEtapaProductiva?.estado === "APROBADA",
            concertacionAprobada: user.concertacionFuncion?.estado === "APROBADA",
            bitacoras: user.bitacoras,
            totalBitacoras: user.totalBitacoras,
            bitacoraInicioTramo: user.bitacoraInicioTramo,
            estadoAprendiz: user.estado,
            evaluacion2Aprobada: momentos.some((e) => e.numero === 2 && e.estado === "APROBADA"),
            evaluacion3Aprobada: momentos.some((e) => e.numero === 3 && e.estado === "APROBADA"),
            certificacionAprobada: user.certificacionEmpresario?.estado === "APROBADA",
          });

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
        <BienvenidaSplash nombre={user.nombres} mensaje={bienvenidaRol[user.role] ?? ""} />
        {header}
        {profile && <EvidenciaEPNav alertas={alertas} />}
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    );
  }

  const pendientes = await pendientesMenu(session.user.id, user.role);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <BienvenidaSplash nombre={user.nombres} mensaje={bienvenidaRol[user.role] ?? ""} />
      {header}
      <div className="flex flex-1 flex-col sm:flex-row">
        <PanelSidebar role={user.role} pendientes={pendientes} />
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
