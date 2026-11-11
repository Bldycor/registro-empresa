import { prisma } from "@/lib/prisma";
import { prismaBase } from "@/lib/prisma-base";
import { sendRechazoEvidenciaEmail } from "@/lib/mailer";
import { destinatariosReunion } from "@/lib/reuniones";
import { describirEvidencia, type EvidenciaRechazada } from "@/lib/rechazo-evidencia-correo";
import { ACCION_AVISO_RECHAZO, PRIMERA_BITACORA_CON_AVISO, ROL_REVISOR, anotarAviso, claveAviso } from "@/lib/notificar-rechazo";

// Envío único del aviso de rechazo a las evidencias que ya estaban rechazadas antes de que existiera
// el correo (pedido del usuario, 10 nov 2026). Mismas reglas del aviso automático: alternativa (la
// última solicitud), formalización, certificación y bitácoras desde la N° 4; no cuenta a quienes ya
// cerraron el proceso (Certificado o Desertó). Una evidencia con aviso anotado después de su
// rechazo no se repite, así que se puede ejecutar más de una vez sin duplicar correos.

type Revisor = { nombres: string; apellidos: string; role: string } | null;
export type RechazoPendiente = {
  aprendizId: string;
  aprendiz: string;
  evidencia: EvidenciaRechazada;
  nombre: string;
  observacion: string | null;
  rechazadaEl: Date | null;
  revisor: Revisor;
  destinatarios: string[];
  para: string;
};

const revisor = { select: { nombres: true, apellidos: true, role: true } } as const;

export async function rechazosSinAvisar(): Promise<RechazoPendiente[]> {
  const [aprendices, avisos] = await Promise.all([
    prisma.user.findMany({
      where: { role: "APRENDIZ", estado: { notIn: ["CERTIFICADO", "DESERTADO"] } },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        email: true,
        companyProfile: { select: { correoCoformador: true } },
        ficha: { select: { instructor: { select: { email: true } } } },
        seleccionesAlternativa: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { estado: true, observacionesAval: true, fechaAval: true, avaladoPor: revisor },
        },
        formalizacionEtapaProductiva: { select: { estado: true, observaciones: true, fechaAval: true, avaladoPor: revisor } },
        certificacionEmpresario: { select: { estado: true, observaciones: true, fechaAval: true, avaladoPor: revisor } },
        bitacoras: {
          where: { estado: "RECHAZADA", numero: { gte: PRIMERA_BITACORA_CON_AVISO } },
          orderBy: { numero: "asc" },
          select: { numero: true, observaciones: true, fechaAval: true, avaladoPor: revisor },
        },
      },
      orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
    }),
    prismaBase.registroAuditoria.findMany({
      where: { accion: ACCION_AVISO_RECHAZO },
      select: { entidadId: true, fecha: true },
    }),
  ]);
  const ultimoAviso = new Map<string, Date>();
  for (const a of avisos) {
    if (a.entidadId && (ultimoAviso.get(a.entidadId) ?? new Date(0)) < a.fecha) ultimoAviso.set(a.entidadId, a.fecha);
  }

  const pendientes: RechazoPendiente[] = [];
  for (const a of aprendices) {
    const destinatarios = destinatariosReunion({
      tipo: "EVALUACION",
      aprendizEmail: a.email,
      instructorEmail: a.ficha?.instructor?.email,
      coformadorEmail: a.companyProfile?.correoCoformador,
    });
    const agregar = (evidencia: EvidenciaRechazada, observacion: string | null, rechazadaEl: Date | null, rev: Revisor) => {
      const aviso = ultimoAviso.get(claveAviso(a.id, evidencia));
      if (aviso && (!rechazadaEl || aviso >= rechazadaEl)) return;
      pendientes.push({
        aprendizId: a.id,
        aprendiz: `${a.nombres} ${a.apellidos}`,
        evidencia,
        nombre: describirEvidencia(evidencia).nombre,
        observacion: observacion?.trim() || null,
        rechazadaEl,
        revisor: rev,
        destinatarios,
        para: a.email.trim(),
      });
    };
    const alt = a.seleccionesAlternativa[0];
    if (alt?.estado === "RECHAZADA") agregar({ tipo: "ALTERNATIVA" }, alt.observacionesAval, alt.fechaAval, alt.avaladoPor);
    const f = a.formalizacionEtapaProductiva;
    if (f?.estado === "RECHAZADA") agregar({ tipo: "FORMALIZACION" }, f.observaciones, f.fechaAval, f.avaladoPor);
    for (const b of a.bitacoras) agregar({ tipo: "BITACORA", numero: b.numero }, b.observaciones, b.fechaAval, b.avaladoPor);
    const c = a.certificacionEmpresario;
    if (c?.estado === "RECHAZADA") agregar({ tipo: "CERTIFICACION" }, c.observaciones, c.fechaAval, c.avaladoPor);
  }
  return pendientes;
}

// Envía uno por uno y anota cada aviso enviado. Devuelve cuántos salieron y cuáles fallaron.
export async function enviarRechazosSinAvisar() {
  const pendientes = await rechazosSinAvisar();
  let enviados = 0;
  const fallidos: string[] = [];
  for (const p of pendientes) {
    try {
      await sendRechazoEvidenciaEmail({
        aprendizEmail: p.para,
        copias: p.destinatarios.filter((d) => d.toLowerCase() !== p.para.toLowerCase()),
        aprendizNombre: p.aprendiz,
        evidencia: p.evidencia,
        revisorNombre: p.revisor ? `${p.revisor.nombres} ${p.revisor.apellidos}` : "su revisor",
        revisorRol: p.revisor ? (ROL_REVISOR[p.revisor.role] ?? "SEPA") : "SEPA",
        observacion: p.observacion,
      });
      await anotarAviso(p.aprendizId, p.evidencia, p.destinatarios);
      enviados++;
    } catch (error) {
      console.error("[avisos-rechazo] No se pudo enviar:", p.aprendiz, p.nombre, error);
      fallidos.push(`${p.aprendiz} · ${p.nombre}`);
    }
  }
  return { total: pendientes.length, enviados, fallidos };
}
