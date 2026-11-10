import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRechazoEvidenciaEmail } from "@/lib/mailer";
import { destinatariosReunion } from "@/lib/reuniones";
import type { EvidenciaRechazada } from "@/lib/rechazo-evidencia-correo";

// Aviso por correo cuando se rechaza una evidencia (pedido del 10 nov 2026). Va al aprendiz, con
// copia al instructor de su ficha y a su coformador, con la observación tal como la escribió quien
// rechazó (es opcional: si no hay, el correo lo dice).
//
// Cubre la alternativa, la formalización, las bitácoras y la certificación del empresario. Los
// Momentos 2 y 3 tienen su propio correo al devolverlos (`sendDevolucionMomentoEmail`), y la
// Concertación no se rechaza. En bitácoras aplica **desde la N° 4** (decisión del usuario): las
// tres primeras no avisan.
//
// El correo sale con `after()`, después de responder: quien rechaza no espera al servidor de correo
// (en la prueba local, con el correo caído, cada rechazo tardaba 6 a 8 s). La respuesta dice a
// quién se le envía; si el envío falla queda en el registro del servidor, y nunca tumba el rechazo.

export const PRIMERA_BITACORA_CON_AVISO = 4;

export function avisaRechazo(evidencia: EvidenciaRechazada): boolean {
  return evidencia.tipo !== "BITACORA" || evidencia.numero >= PRIMERA_BITACORA_CON_AVISO;
}

const ROL_REVISOR: Record<string, string> = {
  INSTRUCTOR: "instructor de seguimiento",
  COORDINADOR: "Coordinación de Etapa Productiva",
  ADMIN: "Coordinación de Etapa Productiva",
};

// A quién se le envía el aviso. Vacío = no se pudo preparar.
export type AvisoRechazo = { destinatarios: string[] };

export async function notificarRechazoEvidencia(p: {
  aprendizId: string;
  evidencia: EvidenciaRechazada;
  observacion: string | null | undefined;
  revisor: { nombres: string; apellidos: string; role: string };
}): Promise<AvisoRechazo | null> {
  if (!avisaRechazo(p.evidencia)) return null;
  try {
    const aprendiz = await prisma.user.findUnique({
      where: { id: p.aprendizId },
      select: {
        nombres: true,
        apellidos: true,
        email: true,
        companyProfile: { select: { correoCoformador: true } },
        ficha: { select: { instructor: { select: { email: true } } } },
      },
    });
    if (!aprendiz) return { destinatarios: [] };

    // Mismas reglas de las citaciones: sin direcciones repetidas ni inválidas.
    const destinatarios = destinatariosReunion({
      tipo: "EVALUACION",
      aprendizEmail: aprendiz.email,
      instructorEmail: aprendiz.ficha?.instructor?.email,
      coformadorEmail: aprendiz.companyProfile?.correoCoformador,
    });
    const paraAprendiz = aprendiz.email.trim();
    after(() =>
      sendRechazoEvidenciaEmail({
        aprendizEmail: paraAprendiz,
        copias: destinatarios.filter((c) => c.toLowerCase() !== paraAprendiz.toLowerCase()),
        aprendizNombre: `${aprendiz.nombres} ${aprendiz.apellidos}`,
        evidencia: p.evidencia,
        revisorNombre: `${p.revisor.nombres} ${p.revisor.apellidos}`,
        revisorRol: ROL_REVISOR[p.revisor.role] ?? "SEPA",
        observacion: p.observacion ?? null,
      }).catch((error) => console.error("[notificar-rechazo] No se pudo enviar el correo:", error)),
    );
    return { destinatarios };
  } catch (error) {
    console.error("[notificar-rechazo] No se pudo preparar el aviso:", error);
    return { destinatarios: [] };
  }
}
