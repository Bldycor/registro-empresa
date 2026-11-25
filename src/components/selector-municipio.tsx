"use client";

import { DEPARTAMENTOS, MUNICIPIOS_POR_DEPARTAMENTO } from "@/lib/colombia";

// Departamento y municipio de residencia (25 nov 2026; reemplaza la comuna de Medellín). Siempre
// de la lista oficial del DANE (src/lib/colombia.ts). El municipio se guarda en `User.ciudad`.
export function SelectorMunicipio({
  departamento,
  ciudad,
  onChange,
  errores,
  claseCampo,
  claseEtiqueta = "flex flex-col gap-1 text-sm font-medium text-zinc-700 dark:text-zinc-300",
  requerido = true,
}: {
  departamento: string;
  ciudad: string;
  onChange: (v: { departamento: string; ciudad: string }) => void;
  errores?: { departamento?: string; ciudad?: string };
  claseCampo: string;
  claseEtiqueta?: string;
  requerido?: boolean;
}) {
  const municipios = departamento ? (MUNICIPIOS_POR_DEPARTAMENTO[departamento] ?? []) : [];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <label className={claseEtiqueta}>
        Departamento
        <select
          required={requerido}
          value={departamento}
          onChange={(e) => onChange({ departamento: e.target.value, ciudad: "" })}
          className={claseCampo}
        >
          <option value="">Selecciona el departamento</option>
          {DEPARTAMENTOS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        {errores?.departamento && <span className="text-xs font-normal text-red-600">{errores.departamento}</span>}
      </label>
      <label className={claseEtiqueta}>
        Municipio
        <select
          required={requerido}
          value={ciudad}
          disabled={!departamento}
          onChange={(e) => onChange({ departamento, ciudad: e.target.value })}
          className={claseCampo}
        >
          <option value="">{departamento ? "Selecciona el municipio" : "Primero el departamento"}</option>
          {municipios.map((m) => (
            <option key={m.codigo} value={m.nombre}>
              {m.nombre}
            </option>
          ))}
        </select>
        {errores?.ciudad && <span className="text-xs font-normal text-red-600">{errores.ciudad}</span>}
      </label>
    </div>
  );
}
