import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";
import { calcularVencimientos, type VencimientoEntrega } from "@/lib/seguimiento-evidencias";
import { sendAvisoPlazosEmail, sendRecordatorioReunionEmail } from "@/lib/mailer";
import { fechaEnColombia } from "@/lib/plazos-institucionales";
import { recordatoriosPendientes } from "@/lib/recordatorio-reuniones";

export const dynamic = "force-dynamic";
// Un correo por aprendiz con avisos, por SMTP y uno tras otro: el límite por defecto se queda corto.
export const maxDuration = 60;

const tipoAviso = (v: VencimientoEntrega): "VENCIDO" | "PROXIMO" =>
  v.estado === "vencida" ? "VENCIDO" : "PROXIMO";

const claveAviso = (clave: string, tipo: string, fechaLimite: Date) =>
  `${clave}|${tipo}|${fechaLimite.toISOString()}`;

// Solo aprendices en curso y con fecha de inicio: los demás no tienen plazos que correr.
function cargarAprendices() {
  return prisma.user.findMany({
    where: { role: "APRENDIZ", estado: "ACTIVO", fechaInicioEtapaProductiva: { not: null } },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      email: true,
      estado: true,
      fechaInicioEtapaProductiva: true,
      fechaFinEtapaProductiva: true,
      totalBitacoras: true,
      bitacoraInicioTramo: true,
      ficha: { select: { codigo: true, instructor: { select: { email: true } } } },
      companyProfile: { select: { correoCoformador: true } },
      concertacionFuncion: { select: { id: true } },
      bitacoras: { select: { numero: true, estado: true } },
      evaluaciones: {
        where: { numero: { in: [2, 3] }, esExtraordinario: false },
        select: { numero: true },
      },
      avisosPlazo: { select: { clave: true, tipo: true, fechaLimite: true } },
    },
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
  });
}

type AprendizAvisos = Awaited<ReturnType<typeof cargarAprendices>>[number];

// Entregas de este aprendiz que todavía no se le han avisado, en el tipo que corresponde hoy.
function avisosNuevos(a: AprendizAvisos, hoy: Date): VencimientoEntrega[] {
  const vencimientos = calcularVencimientos({
    hoy,
    estadoAprendiz: a.estado,
    fechaInicioEP: a.fechaInicioEtapaProductiva,
    fechaFinEP: a.fechaFinEtapaProductiva,
    concertacionAgendada: Boolean(a.concertacionFuncion),
    bitacoras: a.bitacoras,
    totalBitacoras: a.totalBitacoras,
    bitacoraInicioTramo: a.bitacoraInicioTramo,
    momento2Agendado: a.evaluaciones.some((e) => e.numero === 2),
    momento3Agendado: a.evaluaciones.some((e) => e.numero === 3),
  });
  const yaAvisados = new Set(a.avisosPlazo.map((x) => claveAviso(x.clave, x.tipo, x.fechaLimite)));
  return vencimientos.filter((v) => !yaAvisados.has(claveAviso(v.clave, tipoAviso(v), v.fechaLimite)));
}

// Avisos diarios de plazos por correo: bitácoras y Momentos de evaluación (requisito §3.3). En la
// misma pasada salen los recordatorios de las reuniones de hoy y mañana (requisito §3.2, ver
// `recordatoriosPendientes`).
//
// La dispara la tarea programada de Vercel (`vercel.json`, todos los días a las 8 a. m. de
// Colombia), que se identifica con `Authorization: Bearer <CRON_SECRET>`. Coordinación y Admin
// también pueden llamarla con su sesión, pero SOLO en simulación: ven quién recibiría qué, sin que
// se envíe nada.
//
// Hay dos interruptores antes de enviar un solo correo real:
//   1. `CRON_SECRET` configurado, y la llamada viene de la tarea programada;
//   2. `NOTIFICACIONES_ACTIVAS=true` en las variables de entorno.
// `?simular=1` fuerza la simulación incluso desde la tarea programada: sirve para comprobar en
// producción que la clave y el interruptor están bien configurados, sin enviar nada.
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  const esTareaProgramada =
    Boolean(secreto) && request.headers.get("authorization") === `Bearer ${secreto}`;
  if (!esTareaProgramada) {
    const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
    if (!user) return response;
  }

  const interruptorActivo = process.env.NOTIFICACIONES_ACTIVAS === "true";
  const simulacionPedida = new URL(request.url).searchParams.get("simular") === "1";
  const enviar = esTareaProgramada && interruptorActivo && !simulacionPedida;
  const motivoSimulacion = enviar
    ? null
    : !esTareaProgramada
      ? "Consulta con sesión de Coordinación: siempre es simulación."
      : !interruptorActivo
        ? "NOTIFICACIONES_ACTIVAS no está en true: no se envía nada."
        : "Simulación pedida con ?simular=1.";

  const hoy = new Date();
  const aprendices = await cargarAprendices();

  const detalle: {
    aprendiz: string;
    ficha: string | null;
    instructorEnCopia: boolean;
    coformadorEnCopia: boolean;
    avisos: { entrega: string; estado: "proxima" | "vencida"; dias: number; fechaLimite: string }[];
    destinatarios?: string[];
  }[] = [];
  const errores: { aprendiz: string; error: string }[] = [];

  for (const a of aprendices) {
    const nuevos = avisosNuevos(a, hoy);
    if (nuevos.length === 0) continue;

    const nombre = `${a.nombres} ${a.apellidos}`;
    const instructorEmail = a.ficha?.instructor?.email ?? null;
    const coformadorEmail = a.companyProfile?.correoCoformador ?? null;
    let destinatarios: string[] | undefined;

    if (enviar) {
      try {
        const resultado = await sendAvisoPlazosEmail({
          aprendizNombre: nombre,
          aprendizEmail: a.email,
          instructorEmail,
          coformadorEmail,
          avisos: nuevos,
        });
        destinatarios = resultado.destinatarios;
        // Se registra solo después de enviar: si el correo falla, mañana se vuelve a intentar.
        await prisma.avisoPlazo.createMany({
          data: nuevos.map((v) => ({
            userId: a.id,
            clave: v.clave,
            tipo: tipoAviso(v),
            fechaLimite: v.fechaLimite,
            destinatarios: resultado.destinatarios.join(", "),
          })),
          skipDuplicates: true,
        });
      } catch (error) {
        console.error(`[cron/avisos-plazo] No se pudo avisar a ${nombre}:`, error);
        errores.push({ aprendiz: nombre, error: error instanceof Error ? error.message : String(error) });
        continue;
      }
    }

    detalle.push({
      aprendiz: nombre,
      ficha: a.ficha?.codigo ?? null,
      instructorEnCopia: Boolean(instructorEmail),
      coformadorEnCopia: Boolean(coformadorEmail) && nuevos.some((v) => v.estado === "vencida"),
      avisos: nuevos.map((v) => ({
        entrega: v.etiqueta,
        estado: v.estado,
        dias: v.dias,
        fechaLimite: v.fechaLimite.toISOString().slice(0, 10),
      })),
      // Las direcciones solo se devuelven cuando de verdad se envió.
      ...(destinatarios ? { destinatarios } : {}),
    });
  }

  // Recordatorios de las reuniones de hoy y mañana (requisito §3.2), con los mismos interruptores.
  const detalleRecordatorios: {
    aprendiz: string;
    reunion: string;
    fecha: string;
    hora: string;
    cuando: "hoy" | "manana";
    destinatarios: number;
  }[] = [];
  for (const r of await recordatoriosPendientes(hoy)) {
    if (enviar) {
      try {
        const resultado = await sendRecordatorioReunionEmail(r);
        await prisma.avisoPlazo.createMany({
          data: [
            {
              userId: r.userId,
              clave: r.clave,
              tipo: "RECORDATORIO_REUNION",
              fechaLimite: r.fecha,
              destinatarios: resultado.destinatarios.join(", "),
            },
          ],
          skipDuplicates: true,
        });
      } catch (error) {
        console.error(`[cron/avisos-plazo] No se pudo enviar el recordatorio a ${r.aprendizNombre}:`, error);
        errores.push({
          aprendiz: r.aprendizNombre,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }
    }
    detalleRecordatorios.push({
      aprendiz: r.aprendizNombre,
      reunion: r.titulo,
      fecha: r.horario.fecha,
      hora: `${r.horario.horaInicio}-${r.horario.horaFin}`,
      cuando: r.cuando,
      destinatarios: r.destinatarios.length,
    });
  }

  const todos = detalle.flatMap((d) => d.avisos);
  return NextResponse.json({
    modo: enviar ? "envio" : "simulacion",
    motivoSimulacion,
    origen: esTareaProgramada ? "tarea-programada" : "coordinacion",
    interruptorActivo,
    hoyColombia: fechaEnColombia(hoy),
    aprendicesRevisados: aprendices.length,
    aprendicesConAvisos: detalle.length,
    avisos: {
      vencidos: todos.filter((x) => x.estado === "vencida").length,
      proximos: todos.filter((x) => x.estado === "proxima").length,
    },
    recordatorios: { total: detalleRecordatorios.length, detalle: detalleRecordatorios },
    errores,
    detalle,
  });
}

// Punto de partida de los avisos. Coordinación decidió, al activarlos el 14 de septiembre de 2026,
// que lo que ya estuviera vencido en ese momento no generara correo: nadie debía recibir de golpe
// avisos por entregas de hace semanas. Esta acción marca todo lo vencido HOY como avisado, sin
// enviar nada, y desde ahí solo se avisa lo que venza en adelante.
//
// Solo Coordinación o Admin, con su sesión. Se puede repetir sin riesgo: lo ya marcado no se
// duplica. Las filas quedan en el histórico con una nota que dice que no se envió correo.
export async function POST() {
  const { user, response } = await requireApiUser(["COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const hoy = new Date();
  const aprendices = await cargarAprendices();
  const porAprendiz: { aprendiz: string; marcados: number }[] = [];
  let marcados = 0;

  for (const a of aprendices) {
    const vencidos = avisosNuevos(a, hoy).filter((v) => v.estado === "vencida");
    if (vencidos.length === 0) continue;
    const r = await prisma.avisoPlazo.createMany({
      data: vencidos.map((v) => ({
        userId: a.id,
        clave: v.clave,
        tipo: "VENCIDO" as const,
        fechaLimite: v.fechaLimite,
        destinatarios: "(sin correo: ya estaba vencido al activar los avisos)",
      })),
      skipDuplicates: true,
    });
    marcados += r.count;
    porAprendiz.push({ aprendiz: `${a.nombres} ${a.apellidos}`, marcados: r.count });
  }

  return NextResponse.json({ hoyColombia: fechaEnColombia(hoy), marcados, porAprendiz });
}
