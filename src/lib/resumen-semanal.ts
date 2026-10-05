import { prisma } from "@/lib/prisma";
import { construirReporte } from "@/lib/reportes";
import { diasHabilesEntre } from "@/lib/plazos-institucionales";
import type { DatosResumenSemanal } from "@/lib/resumen-semanal-correo";

// Los números del resumen semanal de Coordinación. Salen de las mismas condiciones que las
// bandejas (src/lib/pendientes-menu.ts) y del mismo reporte de Cumplimiento (aprendices en
// riesgo), para que el correo y la pantalla nunca digan cosas distintas.
export async function datosResumenSemanal(hoy: Date): Promise<DatosResumenSemanal> {
  const [alternativas, interrupciones, aplazamientos, planesPorAutorizar, reporte] = await Promise.all([
    prisma.seleccionAlternativaEP.findMany({ where: { estado: "PENDIENTE" }, select: { createdAt: true } }),
    prisma.interrupcionEtapaProductiva.count({ where: { estado: "PENDIENTE" } }),
    prisma.aplazamientoEtapaProductiva.count({ where: { estado: "PENDIENTE" } }),
    prisma.planMejoramiento.count({ where: { estado: "POR_AUTORIZAR" } }),
    construirReporte({ ficha: "", instructor: "", empresa: "", estado: "", desde: "", hasta: "" }),
  ]);
  return {
    // Plazo institucional de 8 días hábiles para el aval (guía GFPI-G-040).
    alternativas: {
      pendientes: alternativas.length,
      fueraDePlazo: alternativas.filter((a) => diasHabilesEntre(a.createdAt, hoy) > 8).length,
    },
    interrupciones,
    aplazamientos,
    planesPorAutorizar,
    porCertificar: reporte.metricas.porEstado.find((e) => e.estado === "POR_CERTIFICAR")?.cantidad ?? 0,
    aprendicesActivos: reporte.metricas.porEstado.find((e) => e.estado === "ACTIVO")?.cantidad ?? 0,
    enRiesgo: reporte.cumplimiento.enRiesgo.map((a) => ({
      nombre: a.nombre,
      ficha: a.ficha,
      motivo: [...a.atrasadas, a.causaDesercion].filter(Boolean).join(" · "),
    })),
  };
}
