"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Recuerda, en esta pestaña, cuál fue la pantalla anterior dentro de SEPA. Lo usa el botón
// «Volver» (`boton-volver.tsx`): al navegar dentro de la aplicación el navegador no actualiza
// `document.referrer`, así que hay que llevar la cuenta aquí.
export const CLAVE_ANTERIOR = "sepa:anterior";
const CLAVE_ACTUAL = "sepa:actual";

export function RastroNavegacion() {
  const pathname = usePathname();
  const params = useSearchParams();
  const ruta = params.size ? `${pathname}?${params}` : pathname;

  useEffect(() => {
    try {
      const actual = sessionStorage.getItem(CLAVE_ACTUAL);
      if (actual && actual !== ruta) sessionStorage.setItem(CLAVE_ANTERIOR, actual);
      sessionStorage.setItem(CLAVE_ACTUAL, ruta);
    } catch {
      // Sin almacenamiento, «Volver» usa su destino por defecto.
    }
  }, [ruta]);

  return null;
}
