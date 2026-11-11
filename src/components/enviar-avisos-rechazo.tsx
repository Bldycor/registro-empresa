"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Botón del envío único de avisos de rechazo: pide confirmar, envía y dice cuántos salieron.
export function EnviarAvisosRechazo({ cantidad }: { cantidad: number }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ total: number; enviados: number; fallidos: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch("/api/coordinador/avisos-rechazo", { method: "POST" });
      if (!res.ok) throw new Error();
      setResultado(await res.json());
      router.refresh();
    } catch {
      setError("No se pudo completar el envío. Vuelve a intentarlo: los avisos ya enviados no se repiten.");
    } finally {
      setEnviando(false);
      setConfirmando(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {resultado && (
        <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          Se enviaron {resultado.enviados} de {resultado.total} avisos.
          {resultado.fallidos.length > 0 && ` No salieron: ${resultado.fallidos.join("; ")}.`}
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {cantidad > 0 &&
        (confirmando ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            ¿Enviar {cantidad} {cantidad === 1 ? "aviso" : "avisos"} por correo ahora?
            <button type="button" disabled={enviando} onClick={enviar} className="rounded-md bg-sena px-4 py-1.5 font-medium text-white hover:bg-sena-oscuro disabled:opacity-50">
              {enviando ? "Enviando…" : "Sí, enviar"}
            </button>
            <button type="button" disabled={enviando} onClick={() => setConfirmando(false)} className="underline">
              No
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmando(true)} className="self-start rounded-md bg-sena px-4 py-2 text-sm font-medium text-white hover:bg-sena-oscuro">
            Enviar {cantidad} {cantidad === 1 ? "aviso" : "avisos"}
          </button>
        ))}
    </div>
  );
}
