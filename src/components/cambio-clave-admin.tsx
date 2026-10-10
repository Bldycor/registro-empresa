"use client";

import { useEffect, useState } from "react";

// Cambio de contraseña de cualquier usuario (solo el administrador; 9 oct 2026). Tres pasos en
// una pantalla: buscar a la persona, escribir la nueva contraseña y confirmar con la propia.

type Usuario = {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  email: string;
  role: "APRENDIZ" | "INSTRUCTOR" | "COORDINADOR" | "ADMIN";
  bloqueado: boolean;
};

const ROL: Record<Usuario["role"], string> = {
  APRENDIZ: "Aprendiz",
  INSTRUCTOR: "Instructor",
  COORDINADOR: "Coordinación",
  ADMIN: "Administrador",
};

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-sena dark:border-zinc-700 dark:bg-zinc-950";
const tarjeta = "rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";

// Sin letras que se confunden al dictarlas (0/O, 1/l/I).
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function generarClave(): string {
  const n = new Uint32Array(10);
  crypto.getRandomValues(n);
  return Array.from(n, (x) => ALFABETO[x % ALFABETO.length]).join("");
}

function primerError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const primero = Object.values(error as Record<string, string[]>).flat()[0];
    if (typeof primero === "string") return primero;
  }
  return "No se pudo cambiar la contraseña.";
}

export function CambioClaveAdmin() {
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<Usuario[] | null>(null);
  const [elegido, setElegido] = useState<Usuario | null>(null);
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [claveAdmin, setClaveAdmin] = useState("");
  const [ver, setVer] = useState(false);
  const [estado, setEstado] = useState<{ tipo: "error" | "ok"; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const texto = q.trim();
    if (texto.length < 3) return;
    const espera = setTimeout(() => {
      fetch(`/api/admin/usuarios?q=${encodeURIComponent(texto)}`)
        .then((r) => r.json())
        .then((d) => setResultados(d.usuarios ?? []))
        .catch(() => setResultados([]));
    }, 350);
    return () => clearTimeout(espera);
  }, [q]);

  function elegir(u: Usuario) {
    setElegido(u);
    setNueva("");
    setConfirmacion("");
    setClaveAdmin("");
    setEstado(null);
  }

  async function cambiar(e: React.FormEvent) {
    e.preventDefault();
    if (!elegido) return;
    setGuardando(true);
    setEstado(null);
    const res = await fetch("/api/admin/usuarios/clave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuarioId: elegido.id, nuevaClave: nueva, confirmacion, claveAdmin }),
    });
    const d = await res.json().catch(() => ({}));
    setGuardando(false);
    setClaveAdmin("");
    if (!res.ok) {
      setEstado({ tipo: "error", texto: primerError(d.error) });
      return;
    }
    setEstado({
      tipo: "ok",
      texto: `Listo: ${d.usuario} ya puede ingresar con la nueva contraseña${elegido.bloqueado ? " (y su cuenta quedó desbloqueada)" : ""}. Entrégasela por un canal seguro; luego puede cambiarla con «¿Olvidaste tu contraseña?».`,
    });
    setElegido({ ...elegido, bloqueado: false });
  }

  return (
    <div className="flex flex-col gap-4">
      <section className={tarjeta}>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">1. Busca a la persona</h2>
        <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">Por cédula, nombre o correo. Sirve para cualquier rol.</p>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (e.target.value.trim().length < 3) setResultados(null);
          }}
          placeholder="Cédula, nombre o correo (mínimo 3 caracteres)"
          className={inputClass}
          autoComplete="off"
        />
        {resultados && (
          <ul className="mt-3 flex flex-col divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {resultados.length === 0 && <li className="px-3 py-2 text-sm text-zinc-500">Nadie coincide con la búsqueda.</li>}
            {resultados.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => elegir(u)}
                  aria-pressed={elegido?.id === u.id}
                  className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                    elegido?.id === u.id ? "bg-sena-claro dark:bg-zinc-800" : ""
                  }`}
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {u.nombres} {u.apellidos}
                  </span>
                  <span className="tabular-nums text-zinc-500 dark:text-zinc-400">CC {u.cedula}</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{ROL[u.role]}</span>
                  {u.bloqueado && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-950/40 dark:text-red-200">
                      ! Bloqueada por intentos fallidos
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {elegido && (
        <form onSubmit={cambiar} className={`${tarjeta} flex flex-col gap-4`}>
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              2. Nueva contraseña para {elegido.nombres} {elegido.apellidos}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {ROL[elegido.role]} · CC {elegido.cedula} · {elegido.email}. Mínimo 8 caracteres.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              Nueva contraseña
              <input type={ver ? "text" : "password"} value={nueva} onChange={(e) => setNueva(e.target.value)} autoComplete="new-password" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              Repite la nueva contraseña
              <input
                type={ver ? "text" : "password"}
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                autoComplete="new-password"
                className={inputClass}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => {
                const c = generarClave();
                setNueva(c);
                setConfirmacion(c);
                setVer(true);
              }}
              className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Generar una segura
            </button>
            <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
              <input type="checkbox" checked={ver} onChange={(e) => setVer(e.target.checked)} />
              Mostrar
            </label>
          </div>

          <div className="rounded-lg border border-amber-300 bg-amber-50/70 p-3 dark:border-amber-800 dark:bg-amber-950/20">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">3. Confirma con tu contraseña de administrador</h3>
            <p className="mb-2 text-xs text-zinc-600 dark:text-zinc-300">
              Así nadie puede cambiar contraseñas desde una sesión tuya que quedó abierta. Tras 5 intentos errados tu
              cuenta se bloquea 15 minutos.
            </p>
            <input
              type="password"
              value={claveAdmin}
              onChange={(e) => setClaveAdmin(e.target.value)}
              autoComplete="current-password"
              placeholder="Tu contraseña"
              className={`${inputClass} sm:max-w-sm`}
            />
          </div>

          {estado && (
            <p
              role={estado.tipo === "error" ? "alert" : "status"}
              className={`rounded-md px-3 py-2 text-sm ${
                estado.tipo === "error"
                  ? "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200"
                  : "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
              }`}
            >
              {estado.texto}
            </p>
          )}
          <button
            type="submit"
            disabled={guardando || !nueva || !confirmacion || !claveAdmin}
            className="w-fit rounded-md bg-sena px-4 py-2 text-sm font-medium text-white hover:bg-sena-oscuro disabled:opacity-50"
          >
            {guardando ? "Cambiando…" : "Cambiar contraseña"}
          </button>
        </form>
      )}
    </div>
  );
}
