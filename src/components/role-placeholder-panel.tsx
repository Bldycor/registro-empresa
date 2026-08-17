const roleCopy: Record<"INSTRUCTOR" | "COORDINADOR", { title: string; description: string }> = {
  INSTRUCTOR: {
    title: "Panel de Instructor",
    description:
      "Aquí podrás hacer seguimiento y evaluar a los aprendices de tu ficha: concertaciones, bitácoras y evaluaciones. Esta parte del sistema está en construcción y estará disponible en la siguiente fase del proyecto.",
  },
  COORDINADOR: {
    title: "Panel de Coordinador",
    description:
      "Aquí podrás consultar informes y métricas de todas las fichas de la Etapa Productiva. Esta parte del sistema está en construcción y estará disponible en la siguiente fase del proyecto.",
  },
};

export function RolePlaceholderPanel({ role }: { role: "INSTRUCTOR" | "COORDINADOR" }) {
  const copy = roleCopy[role];

  return (
    <div className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {copy.title}
      </h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{copy.description}</p>
    </div>
  );
}
