// Sesiones grupales de los momentos (25 nov 2026, decisiones del usuario para la prueba piloto):
// - Convoca el instructor, a toda una ficha o a los aprendices que elija; solo van los convocados.
// - Sirve para los tres momentos; en el Momento 1 la acompaña Coordinación, como siempre.
// - Presencial (con lugar) o virtual (un solo enlace para todos).
// - La evidencia sigue siendo individual: cada aprendiz tiene su ConcertacionFuncion o su
//   Evaluacion con la misma fecha y franja, y se valora por separado.
// Reglas que se conservan: el orden de los momentos (el 2 con el 1 avalado, el 3 con el 2
// evaluado) y que las reuniones del instructor no se crucen; en el Momento 1, además, que no se
// cruce con ninguna otra concertación, porque Coordinación las acompaña todas.

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { NOMBRE_MOMENTO, HORARIO_LIBERADO, REABRIR_DEVUELTO } from "@/lib/momentos";
import { ocupaFranja, correoCoordinacionCitaciones, reunionYaEmpezo } from "@/lib/reuniones";
import { esCorreoValido } from "@/lib/citacion-correo";
import { rangesOverlap, toMinutes } from "@/lib/time";
import { fechaEnColombia } from "@/lib/plazos-institucionales";
import { TODAS_LAS_VARIABLES, variableCategoria } from "@/lib/evaluacion-variables";
import { getVideoConferenceUrl } from "@/lib/video";
import {
  isGoogleCalendarConfigured,
  createCalendarMeetEvent,
  updateCalendarMeetEvent,
  cancelCalendarMeetEvent,
} from "@/lib/google-calendar";
import { componerSesionGrupal, type SesionCorreo } from "@/lib/sesion-grupal-correo";
import { sendSesionGrupalEmail } from "@/lib/mailer";

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export const SesionGrupalSchema = z
  .object({
    momento: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elige la fecha."),
    horaInicio: z.string().regex(HORA, "Elige la hora de inicio."),
    horaFin: z.string().regex(HORA, "Elige la hora de fin."),
    modalidad: z.enum(["PRESENCIAL", "VIRTUAL"], { message: "Elige la modalidad." }),
    lugar: z.string().trim().max(200).optional().nullable(),
    aprendizIds: z.array(z.string().min(1)).min(1, "Elige al menos un aprendiz."),
  })
  .refine((d) => toMinutes(d.horaFin) - toMinutes(d.horaInicio) >= 60, {
    message: "La franja debe ser de al menos una hora.",
    path: ["horaFin"],
  })
  .refine((d) => d.modalidad === "VIRTUAL" || (d.lugar ?? "").length >= 3, {
    message: "Escribe el lugar de la sesión presencial.",
    path: ["lugar"],
  });
export type SesionGrupalInput = z.infer<typeof SesionGrupalSchema>;

export type Situacion = "SIN_AGENDAR" | "INDIVIDUAL" | "OTRA_SESION" | "ESTA_SESION" | "DEVUELTO";
export type Convocable = {
  id: string;
  nombre: string;
  cedula: string;
  ficha: string;
  situacion: Situacion;
  agendado: string | null; // «2026-12-02 08:00» si ya tiene fecha
};

const dia = (fecha: string) => new Date(`${fecha}T00:00:00.000Z`);

// Aprendices de las fichas del instructor que pueden ir a una sesión de ese momento.
export async function convocables(instructorId: string, momento: 1 | 2 | 3, sesionId?: string): Promise<Convocable[]> {
  const aprendices = await prisma.user.findMany({
    where: { role: "APRENDIZ", estado: "ACTIVO", ficha: { instructorId } },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      cedula: true,
      ficha: { select: { codigo: true } },
      companyProfile: { select: { id: true } },
      concertacionFuncion: { select: { estado: true, fecha: true, horaInicio: true, sesionGrupalId: true } },
      evaluaciones: {
        where: { numero: { in: [2, 3] }, esExtraordinario: false },
        select: { numero: true, estado: true, fecha: true, horaInicio: true, sesionGrupalId: true },
      },
    },
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
  });

  const resultado: Convocable[] = [];
  for (const a of aprendices) {
    const m1 = a.concertacionFuncion;
    const m2 = a.evaluaciones.find((e) => e.numero === 2);
    const m3 = a.evaluaciones.find((e) => e.numero === 3);
    const actual = momento === 1 ? m1 : momento === 2 ? m2 : m3;
    // El orden de los momentos y que el momento no esté ya evaluado.
    const habilitado =
      momento === 1 ? Boolean(a.companyProfile) : momento === 2 ? m1?.estado === "APROBADA" : m2?.estado === "APROBADA";
    if (!habilitado || actual?.estado === "APROBADA") continue;

    const situacion: Situacion = !actual
      ? "SIN_AGENDAR"
      : actual.estado === "RECHAZADA"
        ? "DEVUELTO"
        : actual.sesionGrupalId
          ? actual.sesionGrupalId === sesionId
            ? "ESTA_SESION"
            : "OTRA_SESION"
          : actual.fecha
            ? "INDIVIDUAL"
            : "SIN_AGENDAR";
    resultado.push({
      id: a.id,
      nombre: `${a.nombres} ${a.apellidos}`,
      cedula: a.cedula,
      ficha: a.ficha?.codigo ?? "",
      situacion,
      agendado: actual?.fecha && situacion !== "DEVUELTO" ? `${actual.fecha.toISOString().slice(0, 10)} ${actual.horaInicio ?? ""}`.trim() : null,
    });
  }
  return resultado;
}

// ¿Se cruza con otra reunión? No cuentan los momentos de los propios convocados (se reemplazan) ni
// los de la misma sesión.
async function choque(p: {
  instructorId: string;
  momento: 1 | 2 | 3;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  convocados: string[];
  sesionId?: string;
}): Promise<boolean> {
  const fuera = p.sesionId ? [{ sesionGrupalId: null }, { sesionGrupalId: { not: p.sesionId } }] : undefined;
  const [evaluaciones, concertaciones] = await Promise.all([
    prisma.evaluacion.findMany({
      where: {
        fecha: dia(p.fecha),
        user: { ficha: { instructorId: p.instructorId } },
        AND: [
          ocupaFranja,
          ...(fuera ? [{ OR: fuera }] : []),
          ...(p.momento === 1
            ? []
            : [{ NOT: { userId: { in: p.convocados }, numero: p.momento, esExtraordinario: false } }]),
        ],
      },
      select: { horaInicio: true, horaFin: true },
    }),
    prisma.concertacionFuncion.findMany({
      where: {
        fecha: dia(p.fecha),
        // En el Momento 1 no se cruza con ninguna concertación (Coordinación las acompaña todas).
        ...(p.momento === 1 ? { userId: { notIn: p.convocados } } : { user: { ficha: { instructorId: p.instructorId } } }),
        ...(fuera ? { OR: fuera } : {}),
      },
      select: { horaInicio: true, horaFin: true },
    }),
  ]);
  return [...evaluaciones, ...concertaciones].some(
    (r) => r.horaInicio && r.horaFin && rangesOverlap(p.horaInicio, p.horaFin, r.horaInicio, r.horaFin),
  );
}

type Aprendiz = { id: string; nombre: string; email: string; coformador: string | null };

async function datosAprendices(ids: string[]): Promise<Aprendiz[]> {
  const filas = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, nombres: true, apellidos: true, email: true, companyProfile: { select: { correoCoformador: true } } },
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
  });
  return filas.map((a) => ({
    id: a.id,
    nombre: `${a.nombres} ${a.apellidos}`,
    email: a.email,
    coformador: a.companyProfile?.correoCoformador ?? null,
  }));
}

const limpios = (lista: (string | null | undefined)[]) =>
  Array.from(new Set(lista.map((c) => (c ?? "").trim()).filter((c) => c && esCorreoValido(c))));

// Asigna el momento del aprendiz a la sesión, con la fecha y franja de la sesión. Si tenía una
// reunión individual con evento de Google, se devuelve su id para cancelarlo.
async function asignar(
  aprendizId: string,
  s: { id: string; momento: number; fecha: Date; horaInicio: string; horaFin: string; modalidad: "PRESENCIAL" | "VIRTUAL"; videollamadaUrl: string | null },
): Promise<string | null> {
  const horario = { fecha: s.fecha, horaInicio: s.horaInicio, horaFin: s.horaFin, sesionGrupalId: s.id, videollamadaUrl: s.videollamadaUrl, googleEventId: null };
  if (s.momento === 1) {
    const previo = await prisma.concertacionFuncion.findUnique({ where: { userId: aprendizId }, select: { googleEventId: true, sesionGrupalId: true } });
    await prisma.concertacionFuncion.upsert({
      where: { userId: aprendizId },
      update: horario,
      create: { userId: aprendizId, ...horario },
    });
    return previo && !previo.sesionGrupalId ? previo.googleEventId : null;
  }
  const previo = await prisma.evaluacion.findFirst({
    where: { userId: aprendizId, numero: s.momento, esExtraordinario: false },
    select: { id: true, estado: true, googleEventId: true, sesionGrupalId: true },
  });
  if (previo) {
    await prisma.evaluacion.update({
      where: { id: previo.id },
      data: { ...horario, modalidad: s.modalidad, ...(previo.estado === "RECHAZADA" ? REABRIR_DEVUELTO : {}) },
    });
    return previo.sesionGrupalId ? null : previo.googleEventId;
  }
  await prisma.evaluacion.create({
    data: {
      userId: aprendizId,
      numero: s.momento,
      ...horario,
      modalidad: s.modalidad,
      variables: { create: TODAS_LAS_VARIABLES.map((variable) => ({ variable, categoria: variableCategoria[variable] })) },
    },
  });
  return null;
}

// Saca al aprendiz de la sesión. Los Momentos 2 y 3 quedan sin agendar. La concertación no puede
// quedar sin fecha: si todavía no tiene nada (ni formato ni valoración) se borra, y si ya tiene
// algo, se conserva con su fecha y el aprendiz la reagenda.
async function liberar(aprendizId: string, momento: number, sesionId: string) {
  if (momento === 1) {
    const c = await prisma.concertacionFuncion.findUnique({
      where: { userId: aprendizId },
      select: { id: true, estado: true, archivoUrl: true, sesionGrupalId: true, variables: { where: { valoracion: { not: null } }, select: { id: true } } },
    });
    if (!c || c.sesionGrupalId !== sesionId || c.estado === "APROBADA") return;
    if (!c.archivoUrl && c.variables.length === 0) await prisma.concertacionFuncion.delete({ where: { id: c.id } });
    else await prisma.concertacionFuncion.update({ where: { id: c.id }, data: { sesionGrupalId: null, videollamadaUrl: null } });
    return;
  }
  await prisma.evaluacion.updateMany({
    where: { userId: aprendizId, numero: momento, esExtraordinario: false, sesionGrupalId: sesionId, estado: { not: "APROBADA" } },
    data: { ...HORARIO_LIBERADO, sesionGrupalId: null },
  });
}

// Enlace de la videollamada: un evento de Google con el instructor (y Coordinación en el Momento 1)
// como asistentes; a los aprendices les llega por el correo de SEPA, así no se ven entre ellos.
async function videollamada(p: {
  sesionId: string;
  titulo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  asistentes: string[];
  googleEventId: string | null;
}): Promise<{ url: string; googleEventId: string | null }> {
  let url: string | null = null;
  let googleEventId = p.googleEventId;
  if (isGoogleCalendarConfigured()) {
    const input = {
      summary: `Sesión grupal - ${p.titulo}`,
      description: `Videollamada de la sesión grupal del ${p.titulo} (etapa productiva).`,
      fecha: p.fecha,
      horaInicio: p.horaInicio,
      horaFin: p.horaFin,
      attendees: p.asistentes,
    };
    try {
      const r = p.googleEventId ? await updateCalendarMeetEvent({ ...input, eventId: p.googleEventId }) : await createCalendarMeetEvent(input);
      url = r.meetLink ?? r.eventLink ?? null;
      googleEventId = r.eventId;
    } catch (err) {
      console.error("[sesiones-grupales] No se pudo crear/actualizar el evento de Google Calendar:", err);
    }
  }
  return { url: url ?? getVideoConferenceUrl(p.sesionId, "SesionGrupal"), googleEventId };
}

type Envio = { destinatarios: string[]; correo: { subject: string; text: string; html: string }; cancelada?: boolean };

// Los correos se arman aquí y se envían después de responder (ver la ruta).
export function enviarCorreos(sesionId: string, sesion: SesionCorreo, envios: Envio[]) {
  return Promise.allSettled(
    envios.map((e) =>
      sendSesionGrupalEmail({ sesionId, destinatarios: e.destinatarios, correo: e.correo, sesion, cancelada: e.cancelada }).catch((err) =>
        console.error("[sesiones-grupales] No se pudo enviar un correo:", err),
      ),
    ),
  );
}

type Resultado =
  | { ok: true; sesionId: string; envios: Envio[]; sesion: SesionCorreo }
  | { ok: false; status: number; campo: string; mensaje: string };

// Crea la sesión o la actualiza (fecha, franja, modalidad, lugar y convocados).
export async function guardarSesion(
  instructor: { id: string; email: string },
  d: SesionGrupalInput,
  sesionId?: string,
): Promise<Resultado> {
  if (d.fecha < fechaEnColombia(new Date())) return { ok: false, status: 400, campo: "fecha", mensaje: "La fecha no puede ser en el pasado." };

  const previa = sesionId
    ? await prisma.sesionGrupal.findUnique({
        where: { id: sesionId },
        include: { concertaciones: { select: { userId: true } }, evaluaciones: { select: { userId: true } } },
      })
    : null;
  if (sesionId && (!previa || previa.instructorId !== instructor.id)) {
    return { ok: false, status: 404, campo: "_root", mensaje: "Sesión no encontrada." };
  }
  if (previa && previa.momento !== d.momento) {
    return { ok: false, status: 400, campo: "momento", mensaje: "El momento de una sesión no se cambia: crea otra sesión." };
  }
  if (previa && reunionYaEmpezo(previa, new Date())) {
    return { ok: false, status: 409, campo: "_root", mensaje: "La sesión ya empezó o ya pasó: no se puede cambiar." };
  }

  const ids = Array.from(new Set(d.aprendizIds));
  const habilitados = new Map((await convocables(instructor.id, d.momento, sesionId)).map((c) => [c.id, c]));
  const noHabilitados = ids.filter((id) => !habilitados.has(id));
  if (noHabilitados.length) {
    return {
      ok: false,
      status: 409,
      campo: "aprendizIds",
      mensaje: `${noHabilitados.length === 1 ? "Uno de los aprendices elegidos no puede" : `${noHabilitados.length} de los aprendices elegidos no pueden`} tener el ${NOMBRE_MOMENTO[d.momento]} ahora: no es de tus fichas, no está activo, ya lo tiene evaluado o le falta el momento anterior.`,
    };
  }
  if (await choque({ instructorId: instructor.id, momento: d.momento, fecha: d.fecha, horaInicio: d.horaInicio, horaFin: d.horaFin, convocados: ids, sesionId })) {
    return {
      ok: false,
      status: 409,
      campo: "horaInicio",
      mensaje:
        d.momento === 1
          ? "Esa franja se cruza con otra reunión tuya o con otra concertación (Coordinación las acompaña todas). Elige otra."
          : "Esa franja se cruza con otra reunión tuya. Elige otra.",
    };
  }

  const titulo = NOMBRE_MOMENTO[d.momento];
  const lugar = d.modalidad === "PRESENCIAL" ? (d.lugar ?? "").trim() : null;
  const anteriores = new Set([...(previa?.concertaciones ?? []), ...(previa?.evaluaciones ?? [])].map((r) => r.userId));
  const salen = [...anteriores].filter((id) => !ids.includes(id));
  const entran = ids.filter((id) => !anteriores.has(id));
  const siguen = ids.filter((id) => anteriores.has(id));
  const horarioAnterior = previa
    ? { fecha: previa.fecha.toISOString().slice(0, 10), horaInicio: previa.horaInicio, horaFin: previa.horaFin }
    : null;
  const cambioHorario = Boolean(
    previa &&
      (horarioAnterior!.fecha !== d.fecha ||
        previa.horaInicio !== d.horaInicio ||
        previa.horaFin !== d.horaFin ||
        previa.modalidad !== d.modalidad ||
        (previa.lugar ?? null) !== lugar),
  );

  const sesion = previa
    ? await prisma.sesionGrupal.update({
        where: { id: previa.id },
        data: { fecha: dia(d.fecha), horaInicio: d.horaInicio, horaFin: d.horaFin, modalidad: d.modalidad, lugar },
      })
    : await prisma.sesionGrupal.create({
        data: { instructorId: instructor.id, momento: d.momento, fecha: dia(d.fecha), horaInicio: d.horaInicio, horaFin: d.horaFin, modalidad: d.modalidad, lugar },
      });

  // Enlace: solo en la virtual. Si pasa a presencial, se cancela el evento de Google.
  const internos = limpios([instructor.email, d.momento === 1 ? correoCoordinacionCitaciones() : null]);
  let videollamadaUrl: string | null = null;
  let googleEventId: string | null = sesion.googleEventId;
  if (d.modalidad === "VIRTUAL") {
    const v = await videollamada({ sesionId: sesion.id, titulo, fecha: d.fecha, horaInicio: d.horaInicio, horaFin: d.horaFin, asistentes: internos, googleEventId });
    videollamadaUrl = v.url;
    googleEventId = v.googleEventId;
  } else if (googleEventId && isGoogleCalendarConfigured()) {
    await cancelCalendarMeetEvent(googleEventId).then(
      () => (googleEventId = null),
      (err) => console.error("[sesiones-grupales] No se pudo cancelar el evento de Google:", err),
    );
  }
  await prisma.sesionGrupal.update({ where: { id: sesion.id }, data: { videollamadaUrl, googleEventId } });

  const datos = { id: sesion.id, momento: d.momento, fecha: dia(d.fecha), horaInicio: d.horaInicio, horaFin: d.horaFin, modalidad: d.modalidad, videollamadaUrl };
  const eventosIndividuales: string[] = [];
  for (const id of ids) {
    const evento = await asignar(id, datos);
    if (evento) eventosIndividuales.push(evento);
  }
  for (const id of salen) await liberar(id, d.momento, sesion.id);
  // Las reuniones individuales que tenían los convocados quedan reemplazadas por la sesión.
  if (eventosIndividuales.length && isGoogleCalendarConfigured()) {
    await Promise.allSettled(eventosIndividuales.map((e) => cancelCalendarMeetEvent(e)));
  }

  const correoSesion: SesionCorreo = { titulo, horario: { fecha: d.fecha, horaInicio: d.horaInicio, horaFin: d.horaFin }, modalidad: d.modalidad, lugar, videollamadaUrl };
  const [aprendices, salientes] = await Promise.all([datosAprendices(ids), datosAprendices(salen)]);
  const nuevos = new Set(entran);
  const envios: Envio[] = [];
  // Al instructor: siempre que algo cambie, con la lista de convocados.
  if (!previa || cambioHorario || entran.length || salen.length) {
    envios.push({
      destinatarios: internos,
      correo: componerSesionGrupal({ sesion: correoSesion, para: "INSTRUCTOR", convocados: aprendices.map((a) => a.nombre), anterior: cambioHorario ? horarioAnterior : null }),
    });
  }
  for (const a of aprendices) {
    const esNuevo = nuevos.has(a.id) || !previa;
    if (!esNuevo && !cambioHorario) continue;
    envios.push({
      destinatarios: limpios([a.email, a.coformador]),
      correo: componerSesionGrupal({ sesion: correoSesion, para: "APRENDIZ", aprendizNombre: a.nombre, anterior: !esNuevo && cambioHorario ? horarioAnterior : null }),
    });
  }
  for (const a of salientes) {
    envios.push({
      destinatarios: limpios([a.email, a.coformador]),
      correo: componerSesionGrupal({ sesion: correoSesion, para: "APRENDIZ", aprendizNombre: a.nombre, cancelada: true }),
      cancelada: true,
    });
  }
  void siguen;
  return { ok: true, sesionId: sesion.id, envios, sesion: correoSesion };
}

// Cancela la sesión: los convocados quedan sin agendar (ver `liberar`) y les llega el aviso.
export async function cancelarSesion(instructor: { id: string; email: string }, sesionId: string): Promise<Resultado> {
  const s = await prisma.sesionGrupal.findUnique({
    where: { id: sesionId },
    include: { concertaciones: { select: { userId: true } }, evaluaciones: { select: { userId: true } } },
  });
  if (!s || s.instructorId !== instructor.id) return { ok: false, status: 404, campo: "_root", mensaje: "Sesión no encontrada." };
  if (reunionYaEmpezo(s, new Date())) {
    return { ok: false, status: 409, campo: "_root", mensaje: "La sesión ya empezó o ya pasó: no se puede cancelar." };
  }
  const convocados = [...s.concertaciones, ...s.evaluaciones].map((r) => r.userId);
  for (const id of convocados) await liberar(id, s.momento, s.id);
  if (s.googleEventId && isGoogleCalendarConfigured()) {
    await cancelCalendarMeetEvent(s.googleEventId).catch((err) => console.error("[sesiones-grupales] No se pudo cancelar el evento de Google:", err));
  }
  await prisma.sesionGrupal.delete({ where: { id: s.id } });

  const momento = s.momento as 1 | 2 | 3;
  const sesion: SesionCorreo = {
    titulo: NOMBRE_MOMENTO[momento],
    horario: { fecha: s.fecha.toISOString().slice(0, 10), horaInicio: s.horaInicio, horaFin: s.horaFin },
    modalidad: s.modalidad,
    lugar: s.lugar,
    videollamadaUrl: null,
  };
  const aprendices = await datosAprendices(convocados);
  const envios: Envio[] = [
    {
      destinatarios: limpios([instructor.email, momento === 1 ? correoCoordinacionCitaciones() : null]),
      correo: componerSesionGrupal({ sesion, para: "INSTRUCTOR", convocados: aprendices.map((a) => a.nombre), cancelada: true }),
      cancelada: true,
    },
    ...aprendices.map((a) => ({
      destinatarios: limpios([a.email, a.coformador]),
      correo: componerSesionGrupal({ sesion, para: "APRENDIZ" as const, aprendizNombre: a.nombre, cancelada: true }),
      cancelada: true,
    })),
  ];
  return { ok: true, sesionId: s.id, envios, sesion };
}

// Sesiones del instructor desde hace 30 días, con sus convocados y el estado de cada evidencia.
export async function sesionesDelInstructor(instructorId: string) {
  const desde = new Date(`${fechaEnColombia(new Date())}T00:00:00.000Z`);
  desde.setUTCDate(desde.getUTCDate() - 30);
  const filas = await prisma.sesionGrupal.findMany({
    where: { instructorId, fecha: { gte: desde } },
    orderBy: [{ fecha: "asc" }, { horaInicio: "asc" }],
    include: {
      concertaciones: { select: { estado: true, user: { select: { id: true, nombres: true, apellidos: true, ficha: { select: { codigo: true } } } } } },
      evaluaciones: { select: { estado: true, user: { select: { id: true, nombres: true, apellidos: true, ficha: { select: { codigo: true } } } } } },
    },
  });
  const ahora = new Date();
  return filas.map((s) => ({
    id: s.id,
    momento: s.momento as 1 | 2 | 3,
    fecha: s.fecha.toISOString().slice(0, 10),
    horaInicio: s.horaInicio,
    horaFin: s.horaFin,
    modalidad: s.modalidad,
    lugar: s.lugar,
    videollamadaUrl: s.videollamadaUrl,
    empezo: reunionYaEmpezo(s, ahora),
    convocados: [...s.concertaciones, ...s.evaluaciones]
      .map((r) => ({ id: r.user.id, nombre: `${r.user.nombres} ${r.user.apellidos}`, ficha: r.user.ficha?.codigo ?? "", estado: r.estado }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
  }));
}
export type SesionListada = Awaited<ReturnType<typeof sesionesDelInstructor>>[number];
