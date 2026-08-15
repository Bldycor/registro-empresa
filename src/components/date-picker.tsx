"use client";

import { useState } from "react";

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function toDateString(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function DatePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (date: string) => void;
}) {
  const today = startOfDay(new Date());
  const initial = value ? new Date(`${value}T00:00:00`) : today;
  const [viewDate, setViewDate] = useState(
    new Date(initial.getFullYear(), initial.getMonth(), 1)
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startWeekday = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();

  function goPrevMonth() {
    if (isCurrentMonth) return;
    setViewDate(new Date(year, month - 1, 1));
  }

  function goNextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  return (
    <div className="rounded-md border border-zinc-300 p-3 dark:border-zinc-700">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrevMonth}
          disabled={isCurrentMonth}
          aria-label="Mes anterior"
          className="rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          ‹
        </button>
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {MONTHS[month]} {year}
        </span>
        <button
          type="button"
          onClick={goNextMonth}
          aria-label="Mes siguiente"
          className="rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-400">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} />;
          const dateStr = toDateString(date);
          const disabled = startOfDay(date) < today;
          const selected = value === dateStr;
          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => onChange(dateStr)}
              className={`rounded-md py-1.5 text-sm transition-colors ${
                selected
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : disabled
                    ? "cursor-not-allowed text-zinc-300 dark:text-zinc-700"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
