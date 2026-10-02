"use client";

import { useEffect, useMemo, useState } from "react";
import { DEPARTAMENTOS, MUNICIPIOS_POR_DEPARTAMENTO } from "@/lib/colombia";

// Catálogo de empresas co-formadoras (solo el administrador; decisión de Coordinación, 2 oct 2026).
// Todo el proceso queda en una pantalla, en el orden en que se usa:
//   1. Registrar una empresa —el NIT se consulta en el RUES para tomar la razón social oficial—.
//   2. Importar muchas a la vez desde una hoja de cálculo, con revisión previa fila por fila.
//   3. Enlazar las empresas que los aprendices ya habían escrito a mano antes del catálogo.
//   4. Consultar y corregir el catálogo.
// Departamento y municipio se eligen siempre de la lista oficial del DANE.

type Empresa = {
  id: string;
  nit: string;
  nombre: string;
  direccion: string;
  departamento: string | null;
  municipio: string | null;
  aprendices: number;
};
type Pendiente = { nombre: string; direccion: string; aprendices: number };
type Rues = { razonSocial: string; estadoMatricula: string | null; camaraComercio: string | null; ultimoAnoRenovado: string | null };

type Borrador = { nit: string; nombre: string; direccion: string; departamento: string; municipio: string };
const VACIO: Borrador = { nit: "", nombre: "", direccion: "", departamento: "", municipio: "" };

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950";
const tarjeta = "rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";

function primerError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const primero = Object.values(error as Record<string, string[]>).flat()[0];
    if (typeof primero === "string") return primero;
  }
  return "No se pudo guardar.";
}

// Formulario de una empresa: NIT con consulta al RUES, nombre, dirección y ubicación de listas.
function FormularioEmpresa({
  inicial,
  textoBoton,
  onGuardar,
  onCancelar,
}: {
  inicial: Borrador;
  textoBoton: string;
  onGuardar: (b: Borrador) => Promise<string | null>;
  onCancelar?: () => void;
}) {
  const [b, setB] = useState<Borrador>(inicial);
  const [rues, setRues] = useState<{ estado: "nada" | "buscando" | "listo" | "error"; dato?: Rues | null; aviso?: string; enSepa?: string | null }>({ estado: "nada" });
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const municipios = useMemo(
    () => (b.departamento ? (MUNICIPIOS_POR_DEPARTAMENTO[b.departamento] ?? []) : []),
    [b.departamento],
  );

  async function consultarRues() {
    if (!b.nit.trim()) return;
    setRues({ estado: "buscando" });
    try {
      const res = await fetch(`/api/admin/empresas/rues?nit=${encodeURIComponent(b.nit)}`);
      const d = await res.json();
      if (!d.valido) {
        setRues({ estado: "error", aviso: d.error });
        return;
      }
      setB((prev) => ({ ...prev, nit: d.nit }));
      setRues({
        estado: "listo",
        dato: d.rues,
        enSepa: d.enSepa && d.enSepa.id !== undefined ? d.enSepa.nombre : null,
        aviso: d.ruesNoDisponible
          ? "El RUES no respondió en este momento. Puedes registrar la empresa a mano."
          : !d.rues
            ? "Ese NIT no figura en el RUES: puede ser una entidad pública o estar registrada con otro NIT. Verifícalo antes de guardar."
            : undefined,
      });
    } catch {
      setRues({ estado: "error", aviso: "No se pudo consultar el RUES. Puedes registrar la empresa a mano." });
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const problema = await onGuardar(b);
    setGuardando(false);
    if (problema) setError(problema);
    else if (!onCancelar) {
      setB(VACIO);
      setRues({ estado: "nada" });
    }
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">NIT</label>
        <div className="flex flex-wrap gap-2">
          <input
            value={b.nit}
            onChange={(e) => {
              setB({ ...b, nit: e.target.value });
              setRues({ estado: "nada" });
            }}
            onBlur={consultarRues}
            placeholder="811045607-6"
            inputMode="numeric"
            className={`${inputClass} w-48`}
          />
          <button
            type="button"
            onClick={consultarRues}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Consultar en el RUES
          </button>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Con el dígito de verificación. Se consulta el Registro Único Empresarial de las Cámaras de
          Comercio para tomar la razón social oficial.
        </p>
      </div>

      {rues.estado === "buscando" && <p className="text-xs text-zinc-500">Consultando el RUES…</p>}
      {rues.estado === "error" && <p className="text-sm text-red-600">{rues.aviso}</p>}
      {rues.estado === "listo" && (
        <div className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          {rues.enSepa && (
            <p className="mb-2 text-amber-700 dark:text-amber-400">
              Ese NIT ya está registrado en SEPA como «{rues.enSepa}».
            </p>
          )}
          {rues.dato ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{rues.dato.razonSocial}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  RUES · matrícula {rues.dato.estadoMatricula?.toLowerCase() ?? "sin estado"}
                  {rues.dato.ultimoAnoRenovado ? ` · renovada en ${rues.dato.ultimoAnoRenovado}` : ""}
                  {rues.dato.camaraComercio ? ` · Cámara de Comercio ${rues.dato.camaraComercio}` : ""}
                </p>
                {rues.dato.estadoMatricula && rues.dato.estadoMatricula !== "ACTIVA" && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    La matrícula no está activa: confirma que la empresa siga funcionando.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setB({ ...b, nombre: rues.dato!.razonSocial })}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Usar esta razón social
              </button>
            </div>
          ) : (
            <p className="text-amber-700 dark:text-amber-400">{rues.aviso}</p>
          )}
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        Nombre de la empresa
        <input value={b.nombre} onChange={(e) => setB({ ...b, nombre: e.target.value })} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        Dirección
        <input value={b.direccion} onChange={(e) => setB({ ...b, direccion: e.target.value })} className={inputClass} />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Departamento
          <select
            value={b.departamento}
            onChange={(e) => setB({ ...b, departamento: e.target.value, municipio: "" })}
            className={inputClass}
          >
            <option value="">Selecciona</option>
            {DEPARTAMENTOS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          Municipio
          <select
            value={b.municipio}
            onChange={(e) => setB({ ...b, municipio: e.target.value })}
            disabled={!b.departamento}
            className={inputClass}
          >
            <option value="">{b.departamento ? "Selecciona" : "Primero el departamento"}</option>
            {municipios.map((m) => (
              <option key={m.codigo} value={m.nombre}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={guardando}
          className="rounded-md bg-sena px-4 py-2 text-sm font-medium text-white hover:bg-sena-oscuro disabled:opacity-50"
        >
          {guardando ? "Guardando…" : textoBoton}
        </button>
        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

type ResultadoImportacion = {
  simulado: boolean;
  ruesNoDisponible: boolean;
  resumen: { filas: number; nuevas: number; yaRegistradas: number; repetidas: number; conError: number; creadas: number };
  resultados: {
    fila: number;
    nit: string;
    nombre: string;
    estado: "nueva" | "ya-registrada" | "error" | "repetida-en-archivo";
    errores: string[];
    rues: { razonSocial: string; estadoMatricula: string | null } | null;
    avisos: string[];
  }[];
};

const ETIQUETA_ESTADO: Record<ResultadoImportacion["resultados"][number]["estado"], string> = {
  nueva: "Nueva",
  "ya-registrada": "Ya estaba en SEPA",
  error: "Con error",
  "repetida-en-archivo": "Repetida en el archivo",
};

export function EmpresasAdminPanel() {
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null);
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [filtro, setFiltro] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [filas, setFilas] = useState("");
  const [importacion, setImportacion] = useState<ResultadoImportacion | null>(null);
  const [importando, setImportando] = useState(false);
  const [errorImportacion, setErrorImportacion] = useState<string | null>(null);

  const [enlazarA, setEnlazarA] = useState<Record<string, string>>({});

  function cargar() {
    fetch("/api/admin/empresas")
      .then((r) => r.json())
      .then((d) => {
        setEmpresas(d.empresas ?? []);
        setPendientes(d.pendientes ?? []);
      })
      .catch(() => setEmpresas([]));
  }
  useEffect(cargar, []);

  async function crear(b: Borrador): Promise<string | null> {
    const res = await fetch("/api/admin/empresas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return primerError(d.error);
    setAviso(`Empresa «${d.empresa.nombre}» registrada con NIT ${d.empresa.nit}.`);
    cargar();
    return null;
  }

  async function editar(id: string, b: Borrador): Promise<string | null> {
    const res = await fetch(`/api/admin/empresas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return primerError(d.error);
    setEditando(null);
    setAviso(
      d.perfilesActualizados > 0
        ? `Empresa actualizada; se corrigió también en ${d.perfilesActualizados} aprendiz(es) enlazado(s).`
        : "Empresa actualizada.",
    );
    cargar();
    return null;
  }

  async function importar(simular: boolean) {
    setImportando(true);
    setErrorImportacion(null);
    const res = await fetch("/api/admin/empresas/importar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filas, simular }),
    });
    const d = await res.json().catch(() => ({}));
    setImportando(false);
    if (!res.ok) {
      setErrorImportacion(primerError(d.error));
      return;
    }
    setImportacion(d);
    if (!simular) {
      setAviso(`Se registraron ${d.resumen.creadas} empresa(s) desde la hoja de cálculo.`);
      setFilas("");
      cargar();
    }
  }

  async function enlazar(nombreEscrito: string) {
    const empresaId = enlazarA[nombreEscrito];
    if (!empresaId) return;
    const res = await fetch("/api/admin/empresas/enlazar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresaId, nombreEscrito }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setAviso(`Se enlazaron ${d.enlazados} aprendiz(es) que habían escrito «${nombreEscrito}».`);
      cargar();
    }
  }

  const visibles = (empresas ?? []).filter((e) => {
    const t = filtro.trim().toLowerCase();
    return !t || e.nombre.toLowerCase().includes(t) || e.nit.includes(t) || (e.municipio ?? "").toLowerCase().includes(t);
  });

  return (
    <div className="flex flex-col gap-6">
      {aviso && (
        <p className="rounded-md bg-sena-claro px-3 py-2 text-sm text-azul dark:bg-emerald-900/20 dark:text-emerald-400">
          {aviso}
        </p>
      )}

      <section className={tarjeta}>
        <h2 className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">1. Registrar una empresa</h2>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Una empresa es un NIT: si varios aprendices hacen la práctica en la misma, todos quedan
          enlazados a este registro.
        </p>
        <FormularioEmpresa inicial={VACIO} textoBoton="Registrar empresa" onGuardar={crear} />
      </section>

      <section className={tarjeta}>
        <h2 className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          2. Importar desde una hoja de cálculo
        </h2>
        <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
          Copia de Excel o Google Sheets las columnas <strong>NIT, NOMBRE, DIRECCIÓN, DEPARTAMENTO y
          MUNICIPIO</strong>, en ese orden, y pégalas aquí (el encabezado es opcional). Primero se
          revisan todas las filas —NIT y dígito de verificación, departamento y municipio de la
          lista oficial, y el RUES— y después confirmas. Solo se crean las nuevas y válidas.
        </p>
        <textarea
          value={filas}
          onChange={(e) => {
            setFilas(e.target.value);
            setImportacion(null);
          }}
          rows={6}
          placeholder={"NIT\tNOMBRE\tDIRECCIÓN\tDEPARTAMENTO\tMUNICIPIO\n811045607-6\tINVERSIONES EURO S.A.\tCl. 1b Sur #32-12\tAntioquia\tMedellín"}
          className={`${inputClass} w-full font-mono text-xs`}
        />
        {errorImportacion && <p className="mt-2 text-sm text-red-600">{errorImportacion}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={importando || !filas.trim()}
            onClick={() => importar(true)}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {importando ? "Revisando…" : "Revisar filas"}
          </button>
          {importacion?.simulado && importacion.resumen.nuevas > 0 && (
            <button
              type="button"
              disabled={importando}
              onClick={() => importar(false)}
              className="rounded-md bg-sena px-4 py-2 text-sm font-medium text-white hover:bg-sena-oscuro disabled:opacity-50"
            >
              Importar {importacion.resumen.nuevas} empresa(s) nueva(s)
            </button>
          )}
        </div>

        {importacion && (
          <div className="mt-4">
            <p className="mb-2 text-sm text-zinc-700 dark:text-zinc-300">
              {importacion.resumen.filas} filas · <strong>{importacion.resumen.nuevas} nuevas</strong> ·{" "}
              {importacion.resumen.yaRegistradas} ya estaban · {importacion.resumen.repetidas} repetidas ·{" "}
              {importacion.resumen.conError} con error
              {importacion.ruesNoDisponible && " · el RUES no respondió, se revisó sin él"}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-zinc-500 dark:text-zinc-400">
                  <tr>
                    <th className="py-1 pr-3">Fila</th>
                    <th className="py-1 pr-3">NIT</th>
                    <th className="py-1 pr-3">Nombre</th>
                    <th className="py-1 pr-3">RUES</th>
                    <th className="py-1 pr-3">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {importacion.resultados.map((r) => (
                    <tr key={r.fila} className="border-t border-zinc-100 align-top dark:border-zinc-800">
                      <td className="py-1 pr-3 tabular-nums">{r.fila}</td>
                      <td className="py-1 pr-3 tabular-nums whitespace-nowrap">{r.nit}</td>
                      <td className="py-1 pr-3">{r.nombre}</td>
                      <td className="py-1 pr-3">
                        {r.rues ? `${r.rues.razonSocial} (${r.rues.estadoMatricula?.toLowerCase() ?? "—"})` : "—"}
                      </td>
                      <td className="py-1 pr-3">
                        <span
                          className={
                            r.estado === "nueva"
                              ? "text-emerald-700 dark:text-emerald-400"
                              : r.estado === "error"
                                ? "text-red-600"
                                : "text-zinc-500 dark:text-zinc-400"
                          }
                        >
                          {ETIQUETA_ESTADO[r.estado]}
                        </span>
                        {[...r.errores, ...r.avisos].map((t) => (
                          <p key={t} className={r.errores.includes(t) ? "text-red-600" : "text-amber-700 dark:text-amber-400"}>
                            {t}
                          </p>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {pendientes.length > 0 && (
        <section className={tarjeta}>
          <h2 className="mb-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
            3. Empresas que los aprendices escribieron a mano
          </h2>
          <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
            Son de antes del catálogo. Registra cada empresa arriba con su NIT y luego enlázala aquí:
            todos los aprendices que la escribieron así quedan conectados a ella.
          </p>
          <ul className="flex flex-col gap-2">
            {pendientes.map((p) => (
              <li key={p.nombre} className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                <span className="min-w-48 flex-1 text-sm text-zinc-800 dark:text-zinc-200">
                  «{p.nombre}» <span className="text-xs text-zinc-500">· {p.aprendices} aprendiz(es)</span>
                </span>
                <select
                  value={enlazarA[p.nombre] ?? ""}
                  onChange={(e) => setEnlazarA({ ...enlazarA, [p.nombre]: e.target.value })}
                  className={`${inputClass} w-64`}
                >
                  <option value="">Elige la empresa registrada</option>
                  {(empresas ?? []).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre} · {e.nit}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!enlazarA[p.nombre]}
                  onClick={() => enlazar(p.nombre)}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Enlazar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={tarjeta}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {pendientes.length > 0 ? "4." : "3."} Empresas registradas ({empresas?.length ?? 0})
          </h2>
          <input
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por nombre, NIT o municipio"
            className={`${inputClass} w-64`}
          />
        </div>
        {empresas === null ? (
          <p className="text-sm text-zinc-500">Cargando…</p>
        ) : visibles.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {empresas.length === 0 ? "Todavía no hay empresas registradas." : "Ninguna coincide con la búsqueda."}
          </p>
        ) : (
          <ul className="flex flex-col">
            {visibles.map((e) => (
              <li key={e.id} className="border-t border-zinc-100 py-3 first:border-0 dark:border-zinc-800">
                {editando === e.id ? (
                  <FormularioEmpresa
                    inicial={{
                      nit: e.nit,
                      nombre: e.nombre,
                      direccion: e.direccion,
                      departamento: e.departamento ?? "",
                      municipio: e.municipio ?? "",
                    }}
                    textoBoton="Guardar cambios"
                    onGuardar={(b) => editar(e.id, b)}
                    onCancelar={() => setEditando(null)}
                  />
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">{e.nombre}</p>
                      <p className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                        NIT {e.nit} · {e.direccion}
                        {e.municipio ? ` · ${e.municipio}, ${e.departamento}` : ""} · {e.aprendices} aprendiz(es)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditando(e.id)}
                      className="text-xs text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      Editar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
