import { prisma } from "@/lib/prisma";
import { calcularPlazo, type EstadoPlazo } from "@/lib/plazos-institucionales";
import {
  motivoAplazamientoEPLabel,
  motivoInterrupcionEPLabel,
  tipoNovedadEPLabel,
  type MotivoAplazamientoEPValue,
  type MotivoInterrupcionEPValue,
  type TipoNovedadEPValue,
} from "@/lib/validations";

// Novedades de la etapa productiva (guía GFPI-G-040 §9.2). Dos plazos, ambos desde el día del
// hecho y contados en días hábiles:
//   - informarla y registrarla: 3 días hábiles;
//   - dejarla anotada en la bitácora GFPI-F-147: 5 días hábiles.
// Por decisión de Coordinación (24 sep 2026) los dos SOLO ADVIERTEN: nada se bloquea.
//
// Aquí se juntan las tres cosas que la guía llama novedad: las que no detienen la práctica
// (`NovedadEtapaProductiva`), los aplazamientos (§9.3) y las interrupciones (§9.3.1). A estas dos
// últimas se les mide el plazo de registro con la fecha del hecho frente a la de radicación; no
// llevan el de bitácora, porque no se anotan ahí sino en su propio formato.

export const PLAZO_REGISTRO_NOVEDAD_HABILES = 3;
export const PLAZO_BITACORA_NOVEDAD_HABILES = 5;

export type OrigenNovedad = "NOVEDAD" | "INTERRUPCION" | "APLAZAMIENTO";

export type NovedadItem = {
  id: string;
  origen: OrigenNovedad;
  etiquetaOrigen: string;
  tipo: string;
  descripcion: string;
  // Día del hecho (día de calendario) y momento en que quedó registrado en SEPA.
  fechaHecho: Date;
  registradaEn: Date;
  soporteUrl: string | null;
  registradaPor: string | null;
  bitacoraNumero: number | null;
  fechaAnotacionBitacora: Date | null;
  observacionesInstructor: string | null;
  // Solo en aplazamientos e interrupciones, que sí pasan por aval.
  estado: string | null;
  plazoRegistro: EstadoPlazo | null;
  plazoBitacora: EstadoPlazo | null;
  aprendiz: { id: string; nombre: string; cedula: string; ficha: string | null };
};

const APRENDIZ_SELECT = {
  id: true,
  nombres: true,
  apellidos: true,
  cedula: true,
  ficha: { select: { codigo: true } },
} as const;

type AprendizNovedad = {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  ficha: { codigo: string } | null;
};

function datosAprendiz(u: AprendizNovedad) {
  return {
    id: u.id,
    nombre: `${u.nombres} ${u.apellidos}`,
    cedula: u.cedula,
    ficha: u.ficha?.codigo ?? null,
  };
}

// El día del hecho es un día de calendario guardado a medianoche UTC. `calcularPlazo` lo traduce a
// día de Colombia (UTC−5), así que hay que situarlo dentro de ese mismo día allá: a medianoche
// UTC, Colombia todavía va en el día anterior, y el plazo salía con un día de más.
const MEDIO_DIA_MS = 12 * 60 * 60 * 1000;

function diaDelHecho(fecha: Date): Date {
  return new Date(fecha.getTime() + MEDIO_DIA_MS);
}

// El plazo de registro se mide contra el día en que se registró, no contra hoy: una vez
// registrada, el resultado ya no cambia.
export function plazoRegistroNovedad(fechaHecho: Date, registradaEn: Date): EstadoPlazo | null {
  return calcularPlazo({
    desde: diaDelHecho(fechaHecho),
    hoy: registradaEn,
    limite: PLAZO_REGISTRO_NOVEDAD_HABILES,
  });
}

// El de bitácora sigue corriendo mientras nadie deje la constancia.
export function plazoBitacoraNovedad(fechaHecho: Date, anotadaEn: Date | null, hoy: Date): EstadoPlazo | null {
  return calcularPlazo({
    desde: diaDelHecho(fechaHecho),
    hoy: anotadaEn ?? hoy,
    limite: PLAZO_BITACORA_NOVEDAD_HABILES,
  });
}

export async function cargarNovedades(
  filtro: { userId?: string; instructorId?: string },
  hoy: Date = new Date(),
): Promise<NovedadItem[]> {
  const user = filtro.userId
    ? { id: filtro.userId }
    : { role: "APRENDIZ" as const, ficha: { instructorId: filtro.instructorId } };

  const [novedades, interrupciones, aplazamientos] = await Promise.all([
    prisma.novedadEtapaProductiva.findMany({
      where: { user },
      select: {
        id: true,
        tipo: true,
        descripcion: true,
        fechaHecho: true,
        soporteUrl: true,
        bitacoraNumero: true,
        fechaAnotacionBitacora: true,
        observacionesInstructor: true,
        createdAt: true,
        registradaPor: { select: { nombres: true, apellidos: true } },
        user: { select: APRENDIZ_SELECT },
      },
    }),
    prisma.interrupcionEtapaProductiva.findMany({
      where: { user },
      select: {
        id: true,
        motivo: true,
        motivoDetalle: true,
        fechaInterrupcion: true,
        certificadoUrl: true,
        estado: true,
        createdAt: true,
        user: { select: APRENDIZ_SELECT },
      },
    }),
    prisma.aplazamientoEtapaProductiva.findMany({
      where: { user },
      select: {
        id: true,
        motivo: true,
        motivoDetalle: true,
        fechaSuspension: true,
        soporteUrl: true,
        estado: true,
        createdAt: true,
        user: { select: APRENDIZ_SELECT },
      },
    }),
  ]);

  const items: NovedadItem[] = [
    ...novedades.map((n) => ({
      id: n.id,
      origen: "NOVEDAD" as const,
      etiquetaOrigen: "Novedad",
      tipo: tipoNovedadEPLabel[n.tipo as TipoNovedadEPValue],
      descripcion: n.descripcion,
      fechaHecho: n.fechaHecho,
      registradaEn: n.createdAt,
      soporteUrl: n.soporteUrl,
      registradaPor: n.registradaPor ? `${n.registradaPor.nombres} ${n.registradaPor.apellidos}` : null,
      bitacoraNumero: n.bitacoraNumero,
      fechaAnotacionBitacora: n.fechaAnotacionBitacora,
      observacionesInstructor: n.observacionesInstructor,
      estado: null,
      plazoRegistro: plazoRegistroNovedad(n.fechaHecho, n.createdAt),
      plazoBitacora: plazoBitacoraNovedad(n.fechaHecho, n.fechaAnotacionBitacora, hoy),
      aprendiz: datosAprendiz(n.user),
    })),
    ...interrupciones.map((i) => ({
      id: i.id,
      origen: "INTERRUPCION" as const,
      etiquetaOrigen: "Interrupción",
      tipo: motivoInterrupcionEPLabel[i.motivo as MotivoInterrupcionEPValue],
      descripcion: i.motivoDetalle ?? "Interrupción de la etapa productiva (cambio de alternativa).",
      fechaHecho: i.fechaInterrupcion,
      registradaEn: i.createdAt,
      soporteUrl: i.certificadoUrl,
      registradaPor: null,
      bitacoraNumero: null,
      fechaAnotacionBitacora: null,
      observacionesInstructor: null,
      estado: i.estado,
      plazoRegistro: plazoRegistroNovedad(i.fechaInterrupcion, i.createdAt),
      plazoBitacora: null,
      aprendiz: datosAprendiz(i.user),
    })),
    ...aplazamientos.map((a) => ({
      id: a.id,
      origen: "APLAZAMIENTO" as const,
      etiquetaOrigen: "Aplazamiento",
      tipo: motivoAplazamientoEPLabel[a.motivo as MotivoAplazamientoEPValue],
      descripcion: a.motivoDetalle ?? "Aplazamiento de la etapa productiva.",
      fechaHecho: a.fechaSuspension,
      registradaEn: a.createdAt,
      soporteUrl: a.soporteUrl,
      registradaPor: null,
      bitacoraNumero: null,
      fechaAnotacionBitacora: null,
      observacionesInstructor: null,
      estado: a.estado,
      plazoRegistro: plazoRegistroNovedad(a.fechaSuspension, a.createdAt),
      plazoBitacora: null,
      aprendiz: datosAprendiz(a.user),
    })),
  ];

  // La más reciente primero, por el día del hecho.
  return items.sort((x, y) => y.fechaHecho.getTime() - x.fechaHecho.getTime());
}
