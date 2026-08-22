export function EvidenciaEnConstruccion({
  titulo,
  descripcion,
}: {
  titulo: string;
  descripcion: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-4 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{titulo}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{descripcion}</p>
      </div>
      <div className="w-full max-w-2xl rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Esta evidencia está en construcción — llega en la siguiente entrega de Fase 2.
        </p>
      </div>
    </div>
  );
}
