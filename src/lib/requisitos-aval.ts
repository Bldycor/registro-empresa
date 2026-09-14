// Requisitos que la guía GFPI-G-040 §9.1.1 exige verificar ANTES de avalar una alternativa de
// Etapa Productiva.
//
// Por decisión de Coordinación estos requisitos ADVIERTEN, no bloquean: el aval sigue siendo
// posible con un requisito sin verificar, pero entonces hay que escribir por qué, y esa
// constancia queda guardada en la solicitud (`SeleccionAlternativaEP.requisitosOmitidos`) junto
// con quién avaló. La alternativa —bloquear— dejaría atascados casos legítimos que hoy se
// resuelven por fuera del sistema, y empujaría a la gente a evadirlo.
//
// "Sin verificar" (null) y "no cumple" (false) se muestran distinto a propósito: lo primero es
// trabajo pendiente de Coordinación, lo segundo es un hallazgo.

export type EstadoRequisito = "cumple" | "no_cumple" | "sin_verificar" | "no_aplica";

export type Requisito = {
  clave: "raps" | "arl" | "minTrabajo";
  etiqueta: string;
  estado: EstadoRequisito;
  detalle: string;
};

const MS_DIA = 24 * 60 * 60 * 1000;
export const MAYORIA_DE_EDAD = 18;

export function esMenorAlIniciar(
  fechaNacimiento: Date | null,
  fechaInicioEP: Date | null,
): boolean | null {
  if (!fechaNacimiento || !fechaInicioEP) return null;
  const cumple18 = new Date(fechaNacimiento);
  cumple18.setUTCFullYear(cumple18.getUTCFullYear() + MAYORIA_DE_EDAD);
  return fechaInicioEP < cumple18;
}

export function evaluarRequisitosAval(input: {
  rapsEtapaLectivaAprobados: boolean | null;
  fechaNacimiento: Date | null;
  autorizacionMinTrabajoUrl: string | null;
  // Fecha de inicio propuesta en la solicitud que se está avalando.
  fechaInicioPropuesta: Date | null;
  // Afiliación a la ARL registrada en la planeación (Momento 1). Puede no existir todavía: el
  // Momento 1 se diligencia después del aval, así que lo normal al avalar es "sin verificar".
  arlFechaAfiliacion: Date | null;
}): Requisito[] {
  const raps: Requisito =
    input.rapsEtapaLectivaAprobados === true
      ? { clave: "raps", etiqueta: "Resultados de aprendizaje", estado: "cumple", detalle: "Etapa lectiva aprobada al 100%." }
      : input.rapsEtapaLectivaAprobados === false
        ? { clave: "raps", etiqueta: "Resultados de aprendizaje", estado: "no_cumple", detalle: "Tiene resultados de aprendizaje pendientes en la etapa lectiva." }
        : { clave: "raps", etiqueta: "Resultados de aprendizaje", estado: "sin_verificar", detalle: "Nadie ha verificado si aprobó el 100% de la etapa lectiva." };

  const arl: Requisito = (() => {
    if (!input.arlFechaAfiliacion) {
      return {
        clave: "arl",
        etiqueta: "Afiliación a la ARL",
        estado: "sin_verificar",
        detalle: "Sin fecha de afiliación registrada (se captura en la planeación, Momento 1).",
      };
    }
    if (!input.fechaInicioPropuesta) {
      return {
        clave: "arl",
        etiqueta: "Afiliación a la ARL",
        estado: "sin_verificar",
        detalle: "La solicitud no trae fecha de inicio contra la cual comparar.",
      };
    }
    // §9.1.1: la afiliación debe estar vigente como mínimo un día antes de iniciar.
    const limite = new Date(input.fechaInicioPropuesta.getTime() - MS_DIA);
    return input.arlFechaAfiliacion <= limite
      ? { clave: "arl", etiqueta: "Afiliación a la ARL", estado: "cumple", detalle: "Afiliado antes de la fecha de inicio." }
      : {
          clave: "arl",
          etiqueta: "Afiliación a la ARL",
          estado: "no_cumple",
          detalle: "La afiliación no queda vigente al menos un día antes de iniciar.",
        };
  })();

  const menor = esMenorAlIniciar(input.fechaNacimiento, input.fechaInicioPropuesta);
  const minTrabajo: Requisito =
    menor === null
      ? {
          clave: "minTrabajo",
          etiqueta: "Autorización de MinTrabajo",
          estado: "sin_verificar",
          detalle: "Falta la fecha de nacimiento para saber si era menor de edad al iniciar.",
        }
      : menor === false
        ? { clave: "minTrabajo", etiqueta: "Autorización de MinTrabajo", estado: "no_aplica", detalle: "Era mayor de edad al iniciar." }
        : input.autorizacionMinTrabajoUrl
          ? { clave: "minTrabajo", etiqueta: "Autorización de MinTrabajo", estado: "cumple", detalle: "GFPI-F-203 adjunto." }
          : {
              clave: "minTrabajo",
              etiqueta: "Autorización de MinTrabajo",
              estado: "no_cumple",
              detalle: "Es menor de edad y no tiene adjunta la autorización (GFPI-F-203).",
            };

  return [raps, arl, minTrabajo];
}

// Requisitos que obligan a dejar constancia si se avala de todas formas.
export function requisitosPendientes(requisitos: Requisito[]): Requisito[] {
  return requisitos.filter((r) => r.estado === "no_cumple" || r.estado === "sin_verificar");
}
