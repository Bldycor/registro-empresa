import { after } from "next/server";
import { prismaBase } from "@/lib/prisma-base";

// Trazabilidad de SEPA (4 oct 2026). Cada creación, cambio o borrado queda en `RegistroAuditoria`
// con quién lo hizo (de la sesión), cuándo, desde qué IP y qué datos se enviaron. Se escribe
// DESPUÉS de responder (`after`), así que no hace más lenta ninguna pantalla, y un fallo al
// escribir el rastro nunca tumba la operación.

export type Actor = { id: string | null; nombre: string | null; rol: string | null; ip: string | null };

const SIN_ACTOR: Actor = { id: null, nombre: null, rol: null, ip: null };

// Contraseñas, hashes, tokens y secretos nunca entran al rastro.
const CLAVE_SENSIBLE = /password|hash|token|secret|refresh/i;
const TEXTO_MAX = 300;
const DETALLE_MAX = 8000;

export function sanear(valor: unknown, profundidad = 0): unknown {
  if (valor === null || valor === undefined) return valor ?? null;
  if (typeof valor === "string") return valor.length > TEXTO_MAX ? `${valor.slice(0, TEXTO_MAX)}…` : valor;
  if (typeof valor === "bigint") return valor.toString();
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor !== "object") return valor;
  if (profundidad > 4) return "…";
  if (Array.isArray(valor)) {
    const lista = valor.slice(0, 20).map((v) => sanear(v, profundidad + 1));
    return valor.length > 20 ? [...lista, `… y ${valor.length - 20} más`] : lista;
  }
  const salida: Record<string, unknown> = {};
  for (const [clave, v] of Object.entries(valor)) {
    salida[clave] = CLAVE_SENSIBLE.test(clave) ? "[oculto]" : sanear(v, profundidad + 1);
  }
  return salida;
}

function acotar(detalle: unknown): unknown {
  const saneado = sanear(detalle);
  const texto = JSON.stringify(saneado ?? null);
  if (texto.length <= DETALLE_MAX) return saneado;
  const campos =
    saneado && typeof saneado === "object" && !Array.isArray(saneado) ? Object.keys(saneado) : [];
  return { truncado: true, campos };
}

// IP de quien hace la petición (Vercel la pone en x-forwarded-for). Null fuera de una petición.
export async function ipActual(): Promise<string | null> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  } catch {
    return null;
  }
}

// Quién hace la petición actual. Fuera de una petición (tareas programadas, scripts) no hay
// sesión: queda como «Sistema».
export async function actorActual(): Promise<Actor> {
  try {
    const ip = await ipActual();
    const { auth } = await import("@/auth");
    const sesion = await auth();
    return {
      id: sesion?.user?.id ?? null,
      nombre: sesion?.user?.name ?? null,
      rol: sesion?.user?.rol ?? null,
      ip,
    };
  } catch {
    return SIN_ACTOR;
  }
}

export type EventoAuditoria = {
  accion: string;
  entidad: string;
  entidadId?: string | null;
  detalle?: unknown;
  actor?: Actor;
};

async function escribir(e: EventoAuditoria, actor: Actor) {
  try {
    await prismaBase.registroAuditoria.create({
      data: {
        usuarioId: actor.id,
        usuarioNombre: actor.nombre,
        rol: actor.rol,
        ip: actor.ip,
        accion: e.accion,
        entidad: e.entidad,
        entidadId: e.entidadId ?? null,
        detalle: e.detalle === undefined ? undefined : (acotar(e.detalle) as object),
      },
    });
  } catch (error) {
    console.error("[auditoria] No se pudo escribir el rastro:", e.accion, e.entidad, error);
  }
}

// Registra un evento. Dentro de una petición se escribe después de responder; fuera de ella
// (scripts) se escribe en el momento.
export async function registrarAuditoria(e: EventoAuditoria): Promise<void> {
  const actor = e.actor ?? (await actorActual());
  try {
    after(() => escribir(e, actor));
  } catch {
    await escribir(e, actor);
  }
}

// --- Auditoría automática de todas las escrituras (la usa `src/lib/prisma.ts`) ---

const ACCIONES: Record<string, string> = {
  create: "CREAR",
  createMany: "CREAR_VARIOS",
  createManyAndReturn: "CREAR_VARIOS",
  update: "ACTUALIZAR",
  updateMany: "ACTUALIZAR_VARIOS",
  updateManyAndReturn: "ACTUALIZAR_VARIOS",
  upsert: "CREAR_O_ACTUALIZAR",
  delete: "ELIMINAR",
  deleteMany: "ELIMINAR_VARIOS",
};

// El propio rastro, los avisos automáticos del cron (ruido diario) y los enlaces de recuperación
// (llevan el token) no se auditan registro a registro.
const SIN_AUDITAR = new Set(["RegistroAuditoria", "AvisoPlazo", "PasswordResetToken"]);

export function debeAuditar(modelo: string | undefined, operacion: string): modelo is string {
  return Boolean(modelo) && operacion in ACCIONES && !SIN_AUDITAR.has(modelo as string);
}

function idDe(valor: unknown): string | null {
  if (valor && typeof valor === "object" && "id" in valor && typeof valor.id === "string") return valor.id;
  return null;
}

export async function auditarEscritura(
  modelo: string,
  operacion: string,
  args: Record<string, unknown> | undefined,
  resultado: unknown,
) {
  const where = args?.where;
  const datos =
    operacion === "upsert" ? { crear: args?.create, actualizar: args?.update } : (args?.data ?? undefined);
  const varios = operacion.endsWith("Many") || operacion.endsWith("AndReturn");
  const detalle: Record<string, unknown> = {};
  if (datos !== undefined) detalle.datos = datos;
  if (varios || operacion === "delete") detalle.donde = where;
  if (varios && resultado && typeof resultado === "object" && "count" in resultado) {
    detalle.cantidad = (resultado as { count: number }).count;
  }

  await registrarAuditoria({
    accion: ACCIONES[operacion],
    entidad: modelo,
    entidadId: varios ? null : (idDe(where) ?? idDe(resultado)),
    detalle,
  });
}
