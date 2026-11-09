"use client";

import { useState } from "react";
import { DatePickerField } from "@/components/date-picker-field";

// Fecha opcional de un filtro de consulta (9 nov 2026). El <input type="date"> vacío de Safari
// muestra la fecha de hoy en gris y parecía un filtro aplicado («Inicio de EP desde 09/11/2026»):
// aquí, sin fecha, se lee «Cualquier fecha», y se puede quitar con un clic.
export function CampoFechaFiltro({ label, name, inicial }: { label: string; name: string; inicial: string }) {
  const [valor, setValor] = useState(inicial);
  return (
    <div className="flex min-w-44 flex-col gap-1">
      <DatePickerField
        label={label}
        name={name}
        value={valor}
        onChange={setValor}
        placeholder="Cualquier fecha"
        labelClassName="text-xs text-zinc-500 dark:text-zinc-400"
      />
      {valor && (
        <button type="button" onClick={() => setValor("")} className="self-start text-xs text-zinc-500 underline">
          Quitar fecha
        </button>
      )}
    </div>
  );
}
