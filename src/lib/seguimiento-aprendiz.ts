// Datos que necesita el semáforo de un aprendiz y su cálculo, compartidos por el panel de
// Seguimiento (todos los aprendices del instructor) y por el aviso con el que se abre cada
// pantalla de evidencias desde un chip (un solo aprendiz): así los dos dicen siempre lo mismo.
import { calcularSeguimiento } from "@/lib/seguimiento-evidencias";
import type { Prisma } from "@/generated/prisma/client";

export const SEGUIMIENTO_SELECT = {
  id: true,
  nombres: true,
  apellidos: true,
  cedula: true,
  estado: true,
  fechaInicioEtapaProductiva: true,
  fechaFinEtapaProductiva: true,
  totalBitacoras: true,
  bitacoraInicioTramo: true,
  ficha: { select: { codigo: true, programa: true, fechaLimiteIniciarEP: true } },
  seleccionesAlternativa: {
    select: { estado: true },
    orderBy: { createdAt: "desc" },
    take: 1,
  },
  formalizacionEtapaProductiva: { select: { estado: true } },
  concertacionFuncion: { select: { estado: true } },
  bitacoras: { select: { numero: true, estado: true } },
  evaluaciones: {
    where: { numero: { in: [2, 3] }, esExtraordinario: false },
    select: { numero: true, estado: true },
  },
  certificacionEmpresario: { select: { estado: true } },
} satisfies Prisma.UserSelect;

export type AprendizSeguimiento = Prisma.UserGetPayload<{ select: typeof SEGUIMIENTO_SELECT }>;

export function checklistDeAprendiz(a: AprendizSeguimiento, hoy: Date) {
  return calcularSeguimiento({
    hoy,
    fechaInicioEP: a.fechaInicioEtapaProductiva,
    fechaFinEP: a.fechaFinEtapaProductiva,
    fechaLimiteIniciarEPFicha: a.ficha?.fechaLimiteIniciarEP ?? null,
    alternativaAprobada: a.seleccionesAlternativa[0]?.estado === "APROBADA",
    formalizacionAprobada: a.formalizacionEtapaProductiva?.estado === "APROBADA",
    concertacionAprobada: a.concertacionFuncion?.estado === "APROBADA",
    bitacoras: a.bitacoras,
    totalBitacoras: a.totalBitacoras,
    bitacoraInicioTramo: a.bitacoraInicioTramo,
    estadoAprendiz: a.estado,
    evaluacion2Aprobada: a.evaluaciones.some((e) => e.numero === 2 && e.estado === "APROBADA"),
    evaluacion3Aprobada: a.evaluaciones.some((e) => e.numero === 3 && e.estado === "APROBADA"),
    certificacionAprobada: a.certificacionEmpresario?.estado === "APROBADA",
  });
}
