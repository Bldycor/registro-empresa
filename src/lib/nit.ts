// NIT colombiano: número base + dígito de verificación (DV) que calcula la DIAN.
//
// Se acepta como lo escriba la gente —«811045607-6», «811.045.607-6», «8110456076»— y se guarda
// siempre igual, «811045607-6», para que dos maneras de escribir el mismo NIT no parezcan dos
// empresas distintas. El DV es obligatorio y se comprueba: atrapa la mayoría de los errores de
// digitación (un número cambiado, dos números invertidos).

// Pesos oficiales de la DIAN, aplicados de derecha a izquierda sobre el número base.
const PESOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

export function digitoVerificacion(base: string): number {
  const digitos = base.split("").reverse();
  const suma = digitos.reduce((acc, d, i) => acc + Number(d) * PESOS[i], 0);
  const residuo = suma % 11;
  return residuo > 1 ? 11 - residuo : residuo;
}

export type NitValidado =
  | { ok: true; nit: string; base: string; dv: number }
  | { ok: false; error: string };

export function validarNit(texto: string): NitValidado {
  const limpio = (texto ?? "").replace(/[.\s]/g, "").trim();
  if (!limpio) return { ok: false, error: "Escribe el NIT de la empresa." };

  // «811045607-6» o «8110456076»: con guion, o el último dígito es el DV.
  const conGuion = limpio.match(/^(\d{5,15})-(\d)$/);
  const sinGuion = limpio.match(/^(\d{6,16})$/);
  if (!conGuion && !sinGuion) {
    return { ok: false, error: "El NIT son solo números, con el dígito de verificación al final (ej.: 811045607-6)." };
  }

  const base = conGuion ? conGuion[1] : limpio.slice(0, -1);
  const dvEscrito = Number(conGuion ? conGuion[2] : limpio.slice(-1));
  const dvCorrecto = digitoVerificacion(base);

  if (dvEscrito !== dvCorrecto) {
    // Sin guion, lo más común es que hayan olvidado el DV: se les muestra cómo quedaría completo.
    if (sinGuion) {
      return {
        ok: false,
        error: `Falta o no cuadra el dígito de verificación. Si el NIT es ${limpio}, escríbelo completo: ${limpio}-${digitoVerificacion(limpio)}.`,
      };
    }
    return {
      ok: false,
      error: `El dígito de verificación no corresponde: para ${base} debería ser ${dvCorrecto}. Revisa el número.`,
    };
  }
  return { ok: true, nit: `${base}-${dvCorrecto}`, base, dv: dvCorrecto };
}
