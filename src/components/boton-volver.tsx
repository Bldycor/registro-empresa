"use client";

import { useRouter } from "next/navigation";
import { CLAVE_ANTERIOR } from "@/components/rastro-navegacion";

// «Volver» a la pantalla anterior dentro de SEPA (pedido de Coordinación, 9 oct 2026). Si se llegó
// directo —un enlace pegado, una pestaña nueva— no hay a dónde volver: va a `alternativa`.
export function BotonVolver({ alternativa, etiqueta = "Volver" }: { alternativa: string; etiqueta?: string }) {
  const router = useRouter();

  function volver() {
    let anterior: string | null = null;
    try {
      anterior = sessionStorage.getItem(CLAVE_ANTERIOR);
    } catch {
      anterior = null;
    }
    const hayAnterior = Boolean(anterior) && anterior !== window.location.pathname + window.location.search;
    if (hayAnterior && window.history.length > 1) router.back();
    else router.push(hayAnterior ? anterior! : alternativa);
  }

  return (
    <button
      type="button"
      onClick={volver}
      className="inline-flex w-fit items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:border-sena hover:text-azul focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sena dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 print:hidden"
    >
      <span aria-hidden>←</span>
      {etiqueta}
    </button>
  );
}
