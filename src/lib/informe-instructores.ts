import { prisma } from "@/lib/prisma";
import { construirReporte } from "@/lib/reportes";
import { diasHabilesEntre } from "@/lib/plazos-institucionales";
import { superaTope } from "@/lib/tope-instructor";
import { lecturaAlDia, type Lectura } from "@/lib/lectura-indicadores";

// Informe de gestión de cada instructor (pedido de Coordinación, 9 oct 2026; solo Coordinación y
// Admin): cómo va el seguimiento y control del acompañamiento de sus aprendices.
//
// Cuatro preguntas, cada una con su número, qué mide y cómo leerla:
//   1. ¿Sus aprendices van al día?  — la misma clasificación del panorama de Reportes.
//   2. ¿Revisa a tiempo lo que le entregan? — lo que espera su revisión y lo que lleva más de
//      8 días hábiles esperando (el plazo de aval que la guía fija a la institución).
//   3. ¿Cuánto tarda en responder? — días hábiles, en promedio, entre la entrega y su revisión.
//   4. ¿Valora los momentos que ya se hicieron? — reuniones pasadas con su valoración registrada.
//
// La alternativa EP no entra: la avala Coordinación. Las fechas de entrega son aproximadas para una
// evidencia que se corrigió y se volvió a enviar (cuenta desde la primera entrega).

const PLAZO_REVISION_HABILES = 8;

type Pendiente = { aprendizId: string; aprendiz: string; evidencia: string; desde: Date; dias: number };

export type GestionInstructor = {
  id: string;
  nombre: string;
  email: string;
  fichas: string[];
  aprendices: number;
  activos: number;
  sobreTope: boolean;
  grupos: { alDia: number; enRiesgo: number; porCertificar: number; certificados: number; enPausa: number };
  pendientes: Pendiente[];
  demoradas: number;
  respuesta: { promedioDias: number | null; revisadas: number };
  momentos: { realizados: number; valorados: number };
  acompanamiento: { extraordinariasAtendidas: number; extraordinariasPendientes: number; planesElaborados: number; novedadesRegistradas: number };
  lecturas: { alDia: Lectura; revision: Lectura; respuesta: Lectura; momentos: Lectura };
  atencion: number; // cuántas lecturas piden acción: ordena la lista
};

const nombreDe = (u: { nombres: string; apellidos: string }) => `${u.nombres} ${u.apellidos}`;

export async function construirInformeInstructores() {
  const hoy = new Date();
  const [instructores, reporte] = await Promise.all([
    prisma.user.findMany({
      where: { role: "INSTRUCTOR" },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        email: true,
        fichasAsignadas: {
          select: {
            codigo: true,
            aprendices: {
              where: { role: "APRENDIZ" },
              select: {
                id: true,
                nombres: true,
                apellidos: true,
                estado: true,
                formalizacionEtapaProductiva: { select: { estado: true, createdAt: true, updatedAt: true, fechaAval: true } },
                certificacionEmpresario: { select: { estado: true, createdAt: true, updatedAt: true, fechaAval: true } },
                bitacoras: { select: { numero: true, estado: true, fechaEntrega: true, createdAt: true, updatedAt: true, fechaAval: true } },
                concertacionFuncion: { select: { estado: true, fecha: true, fechaAval: true } },
                evaluaciones: { select: { numero: true, esExtraordinario: true, estado: true, fecha: true, createdAt: true, fechaAval: true } },
                novedadesEP: { select: { registradaPorId: true } },
              },
            },
          },
          orderBy: { codigo: "asc" },
        },
        planesMejoramientoCreados: { select: { id: true } },
      },
      orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
    }),
    construirReporte({ ficha: "", instructor: "", empresa: "", estado: "", desde: "", hasta: "" }),
  ]);

  const grupoDe = new Map(reporte.listado.map((l) => [l.id, l.grupo]));

  const resultado: GestionInstructor[] = instructores.map((ins) => {
    const aprendices = ins.fichasAsignadas.flatMap((f) => f.aprendices);
    const grupos = { alDia: 0, enRiesgo: 0, porCertificar: 0, certificados: 0, enPausa: 0 };
    for (const a of aprendices) {
      const g = grupoDe.get(a.id);
      if (g) grupos[g]++;
    }

    const pendientes: Pendiente[] = [];
    const tiempos: number[] = [];
    let realizados = 0;
    let valorados = 0;
    let extraordinariasAtendidas = 0;
    let extraordinariasPendientes = 0;
    let novedadesRegistradas = 0;

    const esperando = (aprendiz: (typeof aprendices)[number], evidencia: string, desde: Date) =>
      pendientes.push({ aprendizId: aprendiz.id, aprendiz: nombreDe(aprendiz), evidencia, desde, dias: diasHabilesEntre(desde, hoy) });
    const respondida = (desde: Date | null, aval: Date | null) => {
      if (desde && aval && aval >= desde) tiempos.push(diasHabilesEntre(desde, aval));
    };

    for (const a of aprendices) {
      // Procesos cerrados o en pausa no generan pendientes nuevos para el instructor.
      const vigente = a.estado === "ACTIVO" || a.estado === "POR_CERTIFICAR";

      const f = a.formalizacionEtapaProductiva;
      if (f) {
        if (f.estado === "PENDIENTE" && vigente) esperando(a, "Formalización", f.updatedAt);
        respondida(f.createdAt, f.fechaAval);
      }
      const c = a.certificacionEmpresario;
      if (c) {
        if (c.estado === "PENDIENTE" && vigente) esperando(a, "Certificación del empresario", c.updatedAt);
        respondida(c.createdAt, c.fechaAval);
      }
      for (const b of a.bitacoras) {
        if (b.estado === "PENDIENTE" && vigente) esperando(a, `Bitácora ${b.numero}`, b.fechaEntrega ?? b.updatedAt);
        respondida(b.fechaEntrega ?? b.createdAt, b.fechaAval);
      }
      const m1 = a.concertacionFuncion;
      if (m1 && m1.fecha <= hoy) {
        realizados++;
        if (m1.estado === "APROBADA") valorados++;
        else if (vigente) esperando(a, "Momento 1 por valorar", m1.fecha);
        respondida(m1.fecha, m1.fechaAval);
      }
      for (const e of a.evaluaciones) {
        if (e.esExtraordinario) {
          if (e.estado === "PENDIENTE") {
            extraordinariasPendientes++;
            if (vigente) esperando(a, "Solicitud de reunión extraordinaria", e.createdAt);
          } else extraordinariasAtendidas++;
          continue;
        }
        if (!e.fecha || e.fecha > hoy) continue;
        realizados++;
        if (e.estado === "APROBADA") valorados++;
        else if (vigente) esperando(a, `Momento ${e.numero} por valorar`, e.fecha);
        respondida(e.fecha, e.fechaAval);
      }
      novedadesRegistradas += a.novedadesEP.filter((n) => n.registradaPorId === ins.id).length;
    }

    pendientes.sort((x, y) => y.dias - x.dias);
    const demoradas = pendientes.filter((p) => p.dias > PLAZO_REVISION_HABILES).length;
    const promedioDias = tiempos.length ? Math.round((tiempos.reduce((s, x) => s + x, 0) / tiempos.length) * 10) / 10 : null;
    const activos = aprendices.filter((a) => a.estado === "ACTIVO").length;
    const enPractica = grupos.alDia + grupos.enRiesgo;

    const lecturas = {
      alDia: lecturaAlDia(grupos.alDia, enPractica),
      revision: lecturaRevision(pendientes.length, demoradas),
      respuesta: lecturaRespuesta(promedioDias, tiempos.length),
      momentos: lecturaMomentos(valorados, realizados),
    };

    return {
      id: ins.id,
      nombre: nombreDe(ins),
      email: ins.email,
      fichas: ins.fichasAsignadas.map((f) => f.codigo),
      aprendices: aprendices.length,
      activos,
      sobreTope: superaTope(activos),
      grupos,
      pendientes,
      demoradas,
      respuesta: { promedioDias, revisadas: tiempos.length },
      momentos: { realizados, valorados },
      acompanamiento: {
        extraordinariasAtendidas,
        extraordinariasPendientes,
        planesElaborados: ins.planesMejoramientoCreados.length,
        novedadesRegistradas,
      },
      lecturas,
      atencion: Object.values(lecturas).filter((l) => l.tono === "atencion").length * 2 +
        Object.values(lecturas).filter((l) => l.tono === "regular").length,
    };
  });

  // Primero quien más necesita apoyo; los que no tienen fichas, al final.
  resultado.sort((x, y) => Number(y.aprendices > 0) - Number(x.aprendices > 0) || y.atencion - x.atencion || x.nombre.localeCompare(y.nombre));

  const conFichas = resultado.filter((r) => r.aprendices > 0);
  return {
    generado: hoy,
    plazoRevision: PLAZO_REVISION_HABILES,
    instructores: resultado,
    centro: {
      instructores: conFichas.length,
      pendientes: conFichas.reduce((s, r) => s + r.pendientes.length, 0),
      demoradas: conFichas.reduce((s, r) => s + r.demoradas, 0),
      momentosRealizados: conFichas.reduce((s, r) => s + r.momentos.realizados, 0),
      momentosValorados: conFichas.reduce((s, r) => s + r.momentos.valorados, 0),
    },
  };
}

function lecturaRevision(pendientes: number, demoradas: number): Lectura {
  if (!pendientes) return { texto: "Bandeja al día: nada espera su revisión.", tono: "bien" };
  if (!demoradas)
    return { texto: `${pendientes} ${pendientes === 1 ? "entrega espera" : "entregas esperan"} revisión, todas dentro de los ${PLAZO_REVISION_HABILES} días hábiles.`, tono: "bien" };
  return {
    texto: `${demoradas} de ${pendientes} ${demoradas === 1 ? "lleva" : "llevan"} más de ${PLAZO_REVISION_HABILES} días hábiles esperando. Conviene priorizarlas: el aprendiz no avanza sin esa revisión.`,
    tono: demoradas >= 3 ? "atencion" : "regular",
  };
}

function lecturaRespuesta(promedio: number | null, revisadas: number): Lectura {
  if (promedio === null) return { texto: "Todavía no hay revisiones para medir el tiempo de respuesta.", tono: "neutro" };
  if (promedio <= 3) return { texto: `Responde rápido: en promedio ${promedio} días hábiles (${revisadas} revisiones).`, tono: "bien" };
  if (promedio <= PLAZO_REVISION_HABILES)
    return { texto: `Responde en ${promedio} días hábiles en promedio, dentro del plazo de ${PLAZO_REVISION_HABILES}.`, tono: "regular" };
  return { texto: `Tarda ${promedio} días hábiles en promedio, más que el plazo de referencia de ${PLAZO_REVISION_HABILES}.`, tono: "atencion" };
}

function lecturaMomentos(valorados: number, realizados: number): Lectura {
  if (!realizados) return { texto: "Aún no hay reuniones de momentos realizadas.", tono: "neutro" };
  const faltan = realizados - valorados;
  if (!faltan) return { texto: `Valoró los ${realizados} momentos que ya se hicieron.`, tono: "bien" };
  return {
    texto: `${faltan} de ${realizados} momentos ya realizados ${faltan === 1 ? "sigue" : "siguen"} sin valorar. La valoración es la evidencia del acompañamiento.`,
    tono: faltan / realizados > 0.3 ? "atencion" : "regular",
  };
}

export type InformeInstructores = Awaited<ReturnType<typeof construirInformeInstructores>>;
