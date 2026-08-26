"use client";

import { useEffect, useRef, useState } from "react";

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

function toDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Selector de fecha con calendario desplegable — reemplaza el <input type="date"> nativo (poco
// consistente entre navegadores) en los formularios de evidencias de Etapa Productiva. Guarda el
// mismo formato "YYYY-MM-DD" que ya usa el resto de la app, es un reemplazo directo.
export function DatePickerField({
  label,
  value,
  onChange,
  error,
  required,
  min,
  max,
  labelClassName,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  min?: string;
  max?: string;
  labelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = toDateOnly(value);
  const [visibleMonth, setVisibleMonth] = useState(() => selected ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  function toggleOpen() {
    setOpen((wasOpen) => {
      if (!wasOpen) setVisibleMonth(selected ?? new Date());
      return !wasOpen;
    });
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const minDate = min ? toDateOnly(min) : null;
  const maxDate = max ? toDateOnly(max) : null;

  const monthLabel = visibleMonth.toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const firstOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), i + 1)),
  ];

  const today = new Date();

  function selectDay(day: Date) {
    if (minDate && day < minDate) return;
    if (maxDate && day > maxDate) return;
    onChange(toValue(day));
    setOpen(false);
  }

  return (
    <div className="relative flex flex-col gap-1" ref={containerRef}>
      <label className={labelClassName ?? "text-sm font-medium text-zinc-700 dark:text-zinc-300"}>
        {label}
        {required && <span className="text-red-600"> *</span>}
      </label>

      <button
        type="button"
        onClick={toggleOpen}
        className="flex items-center justify-between rounded-md border border-zinc-300 px-3 py-2 text-left text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
      >
        <span className={selected ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-400 dark:text-zinc-500"}>
          {selected
            ? selected.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })
            : "Selecciona una fecha"}
        </span>
        <span aria-hidden className="text-zinc-400">
          📅
        </span>
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-72 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
              className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              ‹
            </button>
            <span className="text-sm font-medium capitalize text-zinc-900 dark:text-zinc-50">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
              className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-400 dark:text-zinc-500">
            {DIAS_SEMANA.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <span key={i} />;
              const disabled = (minDate && day < minDate) || (maxDate && day > maxDate);
              const isSelected = selected && isSameDay(day, selected);
              const isToday = isSameDay(day, today);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={Boolean(disabled)}
                  onClick={() => selectDay(day)}
                  className={`rounded-md py-1.5 text-sm transition-colors ${
                    isSelected
                      ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                      : disabled
                        ? "cursor-not-allowed text-zinc-300 dark:text-zinc-700"
                        : isToday
                          ? "font-semibold text-zinc-900 ring-1 ring-inset ring-zinc-300 dark:text-zinc-50 dark:ring-zinc-700"
                          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex justify-between border-t border-zinc-100 pt-2 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => selectDay(today)}
              className="text-xs font-medium text-zinc-600 hover:underline dark:text-zinc-400"
            >
              Hoy
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="text-xs font-medium text-zinc-400 hover:underline dark:text-zinc-500"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
