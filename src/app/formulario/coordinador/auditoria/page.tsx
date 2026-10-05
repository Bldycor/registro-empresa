import Link from "next/link";
import { requireUser } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

// Trazabilidad (4 oct 2026): quién hizo qué, cuándo y desde dónde. Solo consulta: el rastro lo
// escribe la aplicación sola (src/lib/auditoria.ts) y nadie lo puede editar ni borrar desde aquí.

const POR_PAGINA = 50;

const ACCIONES: Record<string, { etiqueta: string; tono: string }> = {
  INGRESO: { etiqueta: "Ingresó", tono: "verde" },
  INGRESO_FALLIDO: { etiqueta: "Ingreso fallido", tono: "ambar" },
  INGRESO_BLOQUEADO: { etiqueta: "Intento con cuenta bloqueada", tono: "rojo" },
  CUENTA_BLOQUEADA: { etiqueta: "Cuenta bloqueada", tono: "rojo" },
  RECUPERACION_SOLICITADA: { etiqueta: "Pidió recuperar contraseña", tono: "ambar" },
  CREAR: { etiqueta: "Creó", tono: "azul" },
  CREAR_VARIOS: { etiqueta: "Creó varios", tono: "azul" },
  ACTUALIZAR: { etiqueta: "Modificó", tono: "neutro" },
  ACTUALIZAR_VARIOS: { etiqueta: "Modificó varios", tono: "neutro" },
  CREAR_O_ACTUALIZAR: { etiqueta: "Guardó", tono: "neutro" },
  ELIMINAR: { etiqueta: "Eliminó", tono: "rojo" },
  ELIMINAR_VARIOS: { etiqueta: "Eliminó varios", tono: "rojo" },
};

const TONOS: Record<string, string> = {
  verde: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800",
  ambar: "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800",
  rojo: "bg-red-50 text-red-800 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-800",
  azul: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-800",
  neutro: "bg-zinc-50 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-700",
};

const ENTIDADES: Record<string, string> = {
  Sesion: "Sesión",
  User: "Usuario",
  Ficha: "Ficha",
  CompetenciaFormacion: "Competencia",
  CompanyProfile: "Perfil de empresa",
  Empresa: "Empresa",
  SeleccionAlternativaEP: "Alternativa EP",
  SeleccionAlternativaGrupo: "Alternativa EP (grupo)",
  AplazamientoEtapaProductiva: "Aplazamiento",
  InterrupcionEtapaProductiva: "Interrupción",
  FormalizacionEtapaProductiva: "Formalización",
  ConcertacionFuncion: "Momento 1",
  ConcertacionVariable: "Valoración Momento 1",
  Evaluacion: "Momento 2/3 o extraordinaria",
  EvaluacionVariable: "Valoración Momento 2/3",
  Bitacora: "Bitácora",
  BitacoraActividad: "Actividad de bitácora",
  CertificacionEmpresario: "Certificación",
  NovedadEtapaProductiva: "Novedad",
  PlanMejoramiento: "Plan de mejoramiento",
  DatosFormatoEP: "Formato GFPI-F-023",
  ConfiguracionCentro: "Datos del centro",
};

const ROLES: Record<string, string> = {
  APRENDIZ: "Aprendiz",
  INSTRUCTOR: "Instructor",
  COORDINADOR: "Coordinación",
  ADMIN: "Administrador",
};

function fechaColombia(d: Date) {
  return d.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function inicioDia(valor: string, finDelDia = false): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  // Días de Colombia (UTC−5).
  return new Date(`${valor}T${finDelDia ? "23:59:59.999" : "00:00:00.000"}-05:00`);
}

function haceHoras(horas: number): Date {
  return new Date(Date.now() - horas * 60 * 60 * 1000);
}

const campo =
  "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950";

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser(["COORDINADOR", "ADMIN"]);
  const sp = await searchParams;
  const texto = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const filtros = {
    quien: texto("quien"),
    accion: texto("accion"),
    entidad: texto("entidad"),
    desde: texto("desde"),
    hasta: texto("hasta"),
  };
  const pagina = Math.max(1, Number.parseInt(texto("pagina") || "1", 10) || 1);

  const where: Prisma.RegistroAuditoriaWhereInput = {};
  if (filtros.quien) where.usuarioNombre = { contains: filtros.quien, mode: "insensitive" };
  if (filtros.accion === "SEGURIDAD") {
    where.entidad = "Sesion";
  } else if (filtros.accion) {
    where.accion = filtros.accion;
  }
  if (filtros.entidad) where.entidad = filtros.entidad;
  const desde = inicioDia(filtros.desde);
  const hasta = inicioDia(filtros.hasta, true);
  if (desde || hasta) where.fecha = { ...(desde ? { gte: desde } : {}), ...(hasta ? { lte: hasta } : {}) };

  const hace24h = haceHoras(24);
  const [total, registros, cambiosHoy, fallidosHoy, bloqueosHoy] = await Promise.all([
    prisma.registroAuditoria.count({ where }),
    prisma.registroAuditoria.findMany({
      where,
      orderBy: { fecha: "desc" },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.registroAuditoria.count({ where: { fecha: { gte: hace24h }, entidad: { not: "Sesion" } } }),
    prisma.registroAuditoria.count({ where: { fecha: { gte: hace24h }, accion: "INGRESO_FALLIDO" } }),
    prisma.registroAuditoria.count({ where: { fecha: { gte: hace24h }, accion: "CUENTA_BLOQUEADA" } }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const hayFiltros = Object.values(filtros).some(Boolean);
  const enlacePagina = (n: number) => {
    const q = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v) as [string, string][]);
    q.set("pagina", String(n));
    return `/formulario/coordinador/auditoria?${q}`;
  };

  return (
    <div className="flex flex-1 flex-col px-4 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Trazabilidad</h1>
          <p className="max-w-3xl text-sm text-zinc-500 dark:text-zinc-400">
            Todo lo que se crea, cambia o borra en SEPA, y cada ingreso, queda registrado con quién lo
            hizo, cuándo y desde qué conexión. Las contraseñas nunca se guardan aquí. Nadie puede
            editar ni borrar este registro.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { etiqueta: "Cambios en las últimas 24 horas", valor: cambiosHoy, tono: "text-zinc-900 dark:text-zinc-50" },
            {
              etiqueta: "Ingresos fallidos (24 h)",
              valor: fallidosHoy,
              tono: fallidosHoy > 10 ? "text-amber-700 dark:text-amber-300" : "text-zinc-900 dark:text-zinc-50",
            },
            {
              etiqueta: "Cuentas bloqueadas (24 h)",
              valor: bloqueosHoy,
              tono: bloqueosHoy > 0 ? "text-red-700 dark:text-red-300" : "text-zinc-900 dark:text-zinc-50",
            },
          ].map((c) => (
            <div key={c.etiqueta} className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{c.etiqueta}</p>
              <p className={`text-2xl font-semibold tabular-nums ${c.tono}`}>{c.valor}</p>
            </div>
          ))}
        </div>

        <form method="get" className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            Quién
            <input name="quien" defaultValue={filtros.quien} placeholder="Nombre" className={campo} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            Qué hizo
            <select name="accion" defaultValue={filtros.accion} className={campo}>
              <option value="">Todo</option>
              <option value="SEGURIDAD">Solo ingresos y seguridad</option>
              {Object.entries(ACCIONES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.etiqueta}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            Sobre qué
            <select name="entidad" defaultValue={filtros.entidad} className={campo}>
              <option value="">Todo</option>
              {Object.entries(ENTIDADES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            Desde
            <input type="date" name="desde" defaultValue={filtros.desde} className={campo} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            Hasta
            <input type="date" name="hasta" defaultValue={filtros.hasta} className={campo} />
          </label>
          <button type="submit" className="rounded-md bg-sena px-4 py-1.5 text-sm font-medium text-white hover:bg-sena-oscuro">
            Buscar
          </button>
          {hayFiltros && (
            <Link href="/formulario/coordinador/auditoria" className="px-2 py-1.5 text-sm text-zinc-600 underline dark:text-zinc-400">
              Quitar filtros
            </Link>
          )}
        </form>

        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <p className="border-b border-zinc-100 px-4 py-2 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {total === 0
              ? "No hay registros con esos filtros."
              : `${total.toLocaleString("es-CO")} registro${total === 1 ? "" : "s"} · página ${pagina} de ${paginas}`}
          </p>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {registros.map((r) => {
              const accion = ACCIONES[r.accion] ?? { etiqueta: r.accion, tono: "neutro" };
              return (
                <li key={r.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[11rem_1fr]">
                  <div className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                    {fechaColombia(r.fecha)}
                    {r.ip && <p className="truncate">IP {r.ip}</p>}
                  </div>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-zinc-800 dark:text-zinc-100">
                      <span className="font-medium">{r.usuarioNombre ?? "Sistema"}</span>
                      {r.rol && <span className="text-xs text-zinc-500 dark:text-zinc-400">{ROLES[r.rol] ?? r.rol}</span>}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${TONOS[accion.tono]}`}>
                        {accion.etiqueta}
                      </span>
                      <span>{ENTIDADES[r.entidad] ?? r.entidad}</span>
                      {r.entidadId && (
                        <code className="text-[11px] text-zinc-400 dark:text-zinc-500">{r.entidadId}</code>
                      )}
                    </p>
                    {r.detalle !== null && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200">
                          Ver datos
                        </summary>
                        <pre className="mt-1 max-h-72 overflow-auto rounded-md bg-zinc-50 p-2 text-[11px] leading-snug text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                          {JSON.stringify(r.detalle, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {paginas > 1 && (
            <nav className="flex items-center justify-between border-t border-zinc-100 px-4 py-2 text-sm dark:border-zinc-800">
              {pagina > 1 ? (
                <Link href={enlacePagina(pagina - 1)} className="text-zinc-700 underline dark:text-zinc-300">
                  ← Más recientes
                </Link>
              ) : (
                <span />
              )}
              {pagina < paginas && (
                <Link href={enlacePagina(pagina + 1)} className="text-zinc-700 underline dark:text-zinc-300">
                  Anteriores →
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
