"use client";

import { useState } from "react";

// Lo que ve quien rechaza una evidencia (10 nov 2026): antes, que saldrá un correo con su
// observación; después, a quién se le envía. El correo sale después de responder, así que aquí se
// dice a quién va, no que ya llegó.

export type AvisoRechazo = { destinatarios: string[] } | null;

// El aviso que devuelve la ruta al rechazar; `null` si no aplica (se avaló, o es una bitácora
// anterior a la N° 4) o si la respuesta no se pudo leer.
export async function leerAvisoRechazo(res: Response): Promise<AvisoRechazo> {
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.aviso ?? null;
}

export function NotaRechazo() {
  return (
    <p className="text-xs text-zinc-500 dark:text-zinc-400">
      Si la rechazas, SEPA avisa por correo al aprendiz, a su instructor y a su coformador, con tu observación.
    </p>
  );
}

export function ResultadoRechazo({ aviso, onCerrar }: { aviso: AvisoRechazo; onCerrar: () => void }) {
  if (!aviso) return null;
  const preparado = aviso.destinatarios.length > 0;
  const clase = preparado
    ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
    : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
  return (
    <div role="status" className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm ${clase}`}>
      <p>
        {preparado
          ? `Evidencia rechazada. SEPA envía el aviso por correo a: ${aviso.destinatarios.join(", ")}.`
          : "La evidencia quedó rechazada, pero no se pudo preparar el correo de aviso. Avísale al aprendiz por otro medio."}
      </p>
      <button type="button" onClick={onCerrar} className="shrink-0 text-xs underline">
        Cerrar
      </button>
    </div>
  );
}

// «Rechazar» en dos pasos: el primer clic pregunta y el segundo rechaza. Un rechazo sale por correo
// al aprendiz y a su coformador, así que un clic por error no debe bastar.
export function BotonRechazar({
  disabled,
  onRechazar,
  avisaPorCorreo = true,
}: {
  disabled: boolean;
  onRechazar: () => void;
  avisaPorCorreo?: boolean;
}) {
  const [confirmando, setConfirmando] = useState(false);
  if (!confirmando) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setConfirmando(true)}
        className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        Rechazar
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
      {avisaPorCorreo ? "¿Rechazar y avisar por correo?" : "¿Rechazar esta evidencia?"}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setConfirmando(false);
          onRechazar();
        }}
        className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        Sí, rechazar
      </button>
      <button type="button" onClick={() => setConfirmando(false)} className="px-1 text-sm underline">
        No
      </button>
    </span>
  );
}
