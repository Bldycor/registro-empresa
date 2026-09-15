import writeExcelFile from "write-excel-file/node";
import { requireApiUser } from "@/lib/auth-guards";
import { construirReporte, describirFiltros, leerFiltros, porcentaje } from "@/lib/reportes";
import { fechaEnColombia, formatoMomento } from "@/lib/plazos-institucionales";

export const dynamic = "force-dynamic";

const negrita = (value: string) => ({ value, fontWeight: "bold" as const });
const texto = (value: string | null | undefined) => (value ? { value } : null);
const numero = (value: number) => ({ value, type: Number });
// Días de calendario guardados a medianoche UTC: se escriben como fecha de Excel.
const fecha = (value: Date | null) => (value ? { value, type: Date, format: "dd/mm/yyyy" } : null);

// Los mismos reportes de /formulario/reportes, con los mismos filtros, en un .xlsx: una hoja por
// reporte, y el de Cumplimiento abierto en dos (el conjunto y la lista de riesgo). Solo consulta.
export async function GET(request: Request) {
  const { user, response } = await requireApiUser(["INSTRUCTOR", "COORDINADOR", "ADMIN"]);
  if (!user) return response;

  const r = await construirReporte(leerFiltros(new URL(request.url).searchParams));
  const m = r.metricas;

  const metricas = [
    [negrita("Reporte de Etapa Productiva — SEPA"), null, null],
    [texto("Generado"), texto(formatoMomento(r.generado)), null],
    [texto("Filtros"), texto(describirFiltros(r)), null],
    [null, null, null],
    [negrita("Indicador"), negrita("Valor"), negrita("Detalle")],
    [texto("Aprendices"), numero(m.aprendices), null],
    ...m.porEstado.map((e) => [texto(`Aprendices en estado «${e.etiqueta}»`), numero(e.cantidad), null]),
    [
      texto("Bitácoras entregadas a tiempo"),
      texto(porcentaje(m.bitacoras.aTiempo, m.bitacoras.entregadas)),
      texto(`${m.bitacoras.aTiempo} de ${m.bitacoras.entregadas} entregadas; ${m.bitacoras.conAtraso} con atraso`),
    ],
    [texto("Bitácoras aprobadas"), numero(m.bitacoras.aprobadas), null],
    [
      texto("Rúbrica en «Satisfactorio» (Momentos 2 y 3)"),
      texto(porcentaje(m.rubrica.satisfactorio, m.rubrica.valoradas)),
      texto(`${m.rubrica.satisfactorio} de ${m.rubrica.valoradas} variables valoradas`),
    ],
    [texto("Juicio final aprobado (Momento 3)"), numero(m.momento3.aprobados), null],
    [texto("Juicio final no aprobado (Momento 3)"), numero(m.momento3.noAprobados), null],
  ];

  const cumplimiento = [
    ["Evidencia", "Completa", "Atrasada", "Próxima a vencer", "Pendiente"].map(negrita),
    ...r.cumplimiento.porEvidencia.map((e) => [
      texto(e.etiqueta),
      numero(e.completa),
      numero(e.atrasada),
      numero(e.proxima),
      numero(e.pendiente),
    ]),
  ];

  const enRiesgo = [
    ["Aprendiz", "Ficha", "Instructor", "Evidencias atrasadas", "Causal de deserción"].map(negrita),
    ...r.cumplimiento.enRiesgo.map((a) => [
      texto(a.nombre),
      texto(a.ficha),
      texto(a.instructor),
      texto(a.atrasadas.join("; ")),
      texto(a.causaDesercion),
    ]),
  ];

  const aprendices = [
    [
      "Aprendiz",
      "Documento",
      "Ficha",
      "Programa",
      "Empresa",
      "Instructor",
      "Estado",
      "Inicio EP",
      "Fin EP",
      "Bitácoras aprobadas",
      "Bitácoras previstas",
      "Momento 1",
      "Momento 2",
      "Momento 3",
      "Certificación",
    ].map(negrita),
    ...r.listado.map((a) => [
      texto(a.nombre),
      texto(a.documento),
      texto(a.ficha),
      texto(a.programa),
      texto(a.empresa),
      texto(a.instructor),
      texto(a.estado),
      fecha(a.inicioEP),
      fecha(a.finEP),
      numero(a.bitacorasAprobadas),
      numero(a.totalBitacoras),
      texto(a.momento1),
      texto(a.momento2),
      texto(a.momento3),
      texto(a.certificacion),
    ]),
  ];

  const ancho = (...w: number[]) => w.map((width) => ({ width }));
  const archivo = await writeExcelFile([
    { data: metricas, sheet: "Métricas", columns: ancho(44, 22, 48) },
    { data: cumplimiento, sheet: "Cumplimiento", columns: ancho(32, 12, 12, 18, 12) },
    { data: enRiesgo, sheet: "En riesgo", columns: ancho(32, 14, 28, 60, 60) },
    { data: aprendices, sheet: "Aprendices", columns: ancho(32, 16, 14, 30, 28, 28, 20, 12, 12, 12, 12, 14, 24, 24, 16) },
  ]).toBuffer();

  return new Response(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-sepa-${fechaEnColombia(r.generado)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
