// Plazos que la guía GFPI-G-040 le impone a la INSTITUCIÓN, no al aprendiz.
//
// El semáforo de evidencias (src/lib/seguimiento-evidencias.ts) mide lo que debe entregar el
// aprendiz. Estos plazos son el otro lado: cuánto puede tardar Coordinación en avalar, el Comité
// en resolver una novedad o el instructor en emitir el juicio. Sin esto una solicitud puede
// quedarse meses en "Pendiente" sin que nada lo señale, que es justamente lo que la guía busca
// evitar al ponerles término.
//
// Los plazos "hábiles" se cuentan de lunes a viernes. NO se descuentan los festivos colombianos:
// hacerlo exigiría mantener el calendario oficial año por año, y para lo que sirve el indicador
// —avisar que un pendiente se está pasando de tiempo— el error de un par de días no cambia la
// decisión. Por eso el badge dice "aprox." cuando ya está vencido.

export const PLAZO_AVAL_ALTERNATIVA_HABILES = 8; // §9.1.2
export const PLAZO_CAMBIO_ALTERNATIVA_HABILES = 15; // §9.3.1
export const PLAZO_REGISTRO_SOFIAPLUS_HABILES = 8; // §9.1.2
export const PLAZO_JUICIO_EVALUATIVO_CALENDARIO = 8; // §9.4

const MS_DIA = 24 * 60 * 60 * 1000;

// Días hábiles transcurridos entre dos fechas (lunes a viernes, sin contar el día inicial).
export function diasHabilesEntre(desde: Date, hasta: Date): number {
  if (hasta <= desde) return 0;
  let habiles = 0;
  const cursor = new Date(
    Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth(), desde.getUTCDate()),
  );
  const fin = new Date(Date.UTC(hasta.getUTCFullYear(), hasta.getUTCMonth(), hasta.getUTCDate()));
  while (cursor < fin) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const dia = cursor.getUTCDay();
    if (dia !== 0 && dia !== 6) habiles++;
  }
  return habiles;
}

export function diasCalendarioEntre(desde: Date, hasta: Date): number {
  return Math.max(0, Math.floor((hasta.getTime() - desde.getTime()) / MS_DIA));
}

export type EstadoPlazo = {
  // Días transcurridos en la unidad del plazo (hábiles o calendario).
  transcurridos: number;
  // null cuando el plazo no tiene término definido en la guía: solo se informa la antigüedad.
  limite: number | null;
  vencido: boolean;
  habiles: boolean;
};

export function calcularPlazo(params: {
  desde: Date | null;
  hoy: Date;
  limite?: number | null;
  habiles?: boolean;
}): EstadoPlazo | null {
  if (!params.desde) return null;
  const habiles = params.habiles ?? true;
  const transcurridos = habiles
    ? diasHabilesEntre(params.desde, params.hoy)
    : diasCalendarioEntre(params.desde, params.hoy);
  const limite = params.limite ?? null;
  return {
    transcurridos,
    limite,
    vencido: limite !== null && transcurridos > limite,
    habiles,
  };
}

// Texto corto para el badge. Se lee igual en los paneles de Coordinación y de instructor.
export function textoPlazo(plazo: EstadoPlazo): string {
  const unidad = plazo.habiles ? "hábil" : "día";
  const unidades = plazo.habiles ? "hábiles" : "días";
  const cuenta = `${plazo.transcurridos} ${plazo.transcurridos === 1 ? unidad : unidades}`;
  if (plazo.limite === null) return `Pendiente hace ${cuenta}`;
  if (plazo.vencido) {
    return `Vencido · ${cuenta} de ${plazo.limite} (aprox., sin descontar festivos)`;
  }
  return `${cuenta} de ${plazo.limite}`;
}
