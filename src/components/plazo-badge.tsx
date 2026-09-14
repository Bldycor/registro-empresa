"use client";

import { calcularPlazo, textoPlazo } from "@/lib/plazos-institucionales";

// Antigüedad de un pendiente frente al plazo que la guía GFPI-G-040 le da a la institución para
// resolverlo. Se muestra solo mientras está PENDIENTE — una vez resuelto, la fecha de aval ya
// cuenta la historia. Ver src/lib/plazos-institucionales.ts para los términos y por qué no se
// descuentan festivos.
export function PlazoBadge({
  desde,
  limite = null,
  habiles = true,
}: {
  // ISO de cuando empezó a correr el plazo (normalmente el `createdAt` de la solicitud).
  desde: string | null;
  limite?: number | null;
  habiles?: boolean;
}) {
  const plazo = calcularPlazo({
    desde: desde ? new Date(desde) : null,
    hoy: new Date(),
    limite,
    habiles,
  });
  if (!plazo) return null;

  // Sin término definido, el dato solo es útil cuando ya lleva un tiempo: un pendiente de ayer no
  // necesita insignia.
  if (plazo.limite === null && plazo.transcurridos < 3) return null;

  const proximo = plazo.limite !== null && !plazo.vencido && plazo.transcurridos >= plazo.limite - 2;

  const estilo = plazo.vencido
    ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400"
    : proximo
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400"
      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";

  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${estilo}`}>
      {textoPlazo(plazo)}
    </span>
  );
}
