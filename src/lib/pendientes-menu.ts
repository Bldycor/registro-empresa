import { prisma } from "@/lib/prisma";

// Contadores del menú lateral (4 oct 2026): cuánto espera una acción en cada bandeja, para que el
// instructor y Coordinación vean de un vistazo dónde tienen trabajo. Son las mismas condiciones
// que usan esas pantallas; las consultas van en paralelo (un solo viaje de ida y vuelta).
export type PendientesMenu = Record<string, number>;

export async function pendientesMenu(userId: string, role: string): Promise<PendientesMenu> {
  if (role === "INSTRUCTOR") {
    const mias = { user: { ficha: { instructorId: userId } } };
    const ahora = new Date();
    const [alternativas, formalizaciones, bitacoras, concertaciones, momentos, certificacion, extraordinarias, planes] =
      await Promise.all([
        prisma.seleccionAlternativaEP.count({ where: { ...mias, estado: "PENDIENTE" } }),
        prisma.formalizacionEtapaProductiva.count({ where: { ...mias, estado: "PENDIENTE" } }),
        prisma.bitacora.count({ where: { ...mias, estado: "PENDIENTE" } }),
        // Un Momento solo espera al instructor cuando la reunión ya pasó y falta valorarlo.
        prisma.concertacionFuncion.count({ where: { ...mias, estado: "PENDIENTE", fecha: { lte: ahora } } }),
        prisma.evaluacion.count({
          where: { ...mias, estado: "PENDIENTE", esExtraordinario: false, numero: { in: [2, 3] }, fecha: { lte: ahora } },
        }),
        prisma.certificacionEmpresario.count({ where: { ...mias, estado: "PENDIENTE" } }),
        prisma.evaluacion.count({ where: { ...mias, estado: "PENDIENTE", esExtraordinario: true } }),
        // Planes que Coordinación le devolvió para corregir.
        prisma.planMejoramiento.count({ where: { ...mias, estado: "DEVUELTO" } }),
      ]);
    return {
      "/formulario/instructor/alternativas": alternativas,
      "/formulario/instructor/formalizaciones": formalizaciones,
      "/formulario/instructor/bitacoras": bitacoras,
      "/formulario/instructor/evaluaciones": concertaciones + momentos,
      "/formulario/instructor/certificacion": certificacion,
      "/formulario/instructor/extraordinarias": extraordinarias,
      "/formulario/instructor/planes": planes,
    };
  }

  if (role === "COORDINADOR" || role === "ADMIN") {
    const [alternativas, interrupciones, aplazamientos, planes] = await Promise.all([
      prisma.seleccionAlternativaEP.count({ where: { estado: "PENDIENTE" } }),
      prisma.interrupcionEtapaProductiva.count({ where: { estado: "PENDIENTE" } }),
      prisma.aplazamientoEtapaProductiva.count({ where: { estado: "PENDIENTE" } }),
      prisma.planMejoramiento.count({ where: { estado: "POR_AUTORIZAR" } }),
    ]);
    return {
      "/formulario/coordinador/alternativas": alternativas,
      "/formulario/coordinador/interrupciones": interrupciones,
      "/formulario/coordinador/aplazamientos": aplazamientos,
      "/formulario/coordinador/planes": planes,
    };
  }

  return {};
}
