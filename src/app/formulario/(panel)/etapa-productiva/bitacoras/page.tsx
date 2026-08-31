import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-guards";
import { calcularFechasLimiteBitacoras, calcularPeriodoBitacora } from "@/lib/bitacora-fechas";
import { BitacorasAprendizPanel, type BitacoraSlot } from "@/components/bitacoras-aprendiz-panel";

export const dynamic = "force-dynamic";

export default async function BitacorasPage() {
  const currentUser = await requireUser(["APRENDIZ"]);

  const aprendiz = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { fechaInicioEtapaProductiva: true },
  });

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-4 py-10">
      <div className="w-full max-w-2xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Bitácoras
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Registro quincenal de actividades durante tu Etapa Productiva (formato GFPI-F-147) — 12
          bitácoras, cada 15 días desde tu fecha de inicio.
        </p>
      </div>

      {!aprendiz?.fechaInicioEtapaProductiva ? (
        <div className="w-full max-w-2xl rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Todavía no tienes fecha de inicio de Etapa Productiva definida. Debes tener aprobada
            tu Selección de Alternativa antes de poder diligenciar bitácoras.
          </p>
        </div>
      ) : (
        <BitacorasPanelServer
          userId={currentUser.id}
          fechaInicioEtapaProductiva={aprendiz.fechaInicioEtapaProductiva}
        />
      )}
    </div>
  );
}

async function BitacorasPanelServer({
  userId,
  fechaInicioEtapaProductiva,
}: {
  userId: string;
  fechaInicioEtapaProductiva: Date;
}) {
  const [bitacoras, fechasLimite] = [
    await prisma.bitacora.findMany({
      where: { userId },
      orderBy: { numero: "asc" },
      include: { actividades: true },
    }),
    calcularFechasLimiteBitacoras(fechaInicioEtapaProductiva),
  ];

  const bitacoraPorNumero = new Map(bitacoras.map((b) => [b.numero, b]));

  // Para prellenar una bitácora nueva: la más reciente ya enviada ANTES de `numero` (no
  // necesariamente numero-1, por si el aprendiz se saltó alguna).
  function buscarPrevia(numero: number) {
    for (let n = numero - 1; n >= 1; n--) {
      const previa = bitacoraPorNumero.get(n);
      if (previa) return previa;
    }
    return null;
  }

  const slots: BitacoraSlot[] = fechasLimite.map((fechaLimite, idx) => {
    const numero = idx + 1;
    const existente = bitacoraPorNumero.get(numero);
    const periodoSugerido = calcularPeriodoBitacora(fechaInicioEtapaProductiva, numero);
    const previa = !existente ? buscarPrevia(numero) : null;

    return {
      numero,
      fechaLimite: fechaLimite.toISOString(),
      periodoSugerido: {
        desde: periodoSugerido.desde.toISOString(),
        hasta: periodoSugerido.hasta.toISOString(),
      },
      existing: existente
        ? {
            fechaEntrega: existente.fechaEntrega?.toISOString() ?? null,
            estado: existente.estado as "PENDIENTE" | "APROBADA" | "RECHAZADA",
            observaciones: existente.observaciones,
            periodoDesde: existente.periodoDesde?.toISOString() ?? null,
            periodoHasta: existente.periodoHasta?.toISOString() ?? null,
            archivoUrl: existente.archivoUrl,
            arlAfiliado: existente.arlAfiliado,
            arlNivelRiesgo: existente.arlNivelRiesgo,
            arlRiesgoCorresponde: existente.arlRiesgoCorresponde,
            arlTieneEPP: existente.arlTieneEPP,
            actividades: existente.actividades.map((a) => ({
              descripcion: a.descripcion,
              competencias: a.competencias,
              evidenciaCumplimiento: a.evidenciaCumplimiento,
              observaciones: a.observaciones,
            })),
          }
        : null,
      prefillPrevio: previa
        ? {
            arlAfiliado: previa.arlAfiliado,
            arlNivelRiesgo: previa.arlNivelRiesgo,
            arlRiesgoCorresponde: previa.arlRiesgoCorresponde,
            arlTieneEPP: previa.arlTieneEPP,
            actividades: previa.actividades.map((a) => ({
              descripcion: a.descripcion,
              competencias: a.competencias,
              evidenciaCumplimiento: a.evidenciaCumplimiento,
              observaciones: a.observaciones,
            })),
          }
        : null,
    };
  });

  return <BitacorasAprendizPanel slots={slots} />;
}
