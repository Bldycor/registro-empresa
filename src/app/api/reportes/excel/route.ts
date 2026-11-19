import writeExcelFile from "write-excel-file/node";
import { requireApiUser } from "@/lib/auth-guards";
import { construirReporte, describirFiltros, leerFiltros, porcentaje } from "@/lib/reportes";
import { fechaEnColombia, formatoMomento } from "@/lib/plazos-institucionales";
import { construirInformeInstructores } from "@/lib/informe-instructores";
import { construirInformeFunciones } from "@/lib/informe-funciones";
import { lecturaAcademica, lecturaFormacion, type LecturaCoordinacion } from "@/lib/lectura-coordinaciones";

export const dynamic = "force-dynamic";

const negrita = (value: string) => ({ value, fontWeight: "bold" as const });
const texto = (value: string | null | undefined) => (value ? { value } : null);
const numero = (value: number) => ({ value, type: Number });
// Días de calendario guardados a medianoche UTC: se escriben como fecha de Excel.
const fecha = (value: Date | null) => (value ? { value, type: Date, format: "dd/mm/yyyy" } : null);

// Los mismos reportes de /formulario/reportes, con los mismos filtros, en un .xlsx: una hoja por
// reporte, y el de Cumplimiento abierto en dos (el conjunto y la lista de riesgo). Solo consulta.
export async function GET(request: Request) {
  const { user, response } = await requireApiUser(["INSTRUCTOR", "COORDINADOR", "ADMIN", "COORDINADOR_FORMACION"]);
  if (!user) return response;

  const filtros = leerFiltros(new URL(request.url).searchParams);
  // Las lecturas por funciones van a quien las ve en pantalla: la de Formación (Res. 4017, tablero)
  // a Coordinación de Formación, Coordinación de EP y Admin; la Académica (Res. 4016, Reportes) a
  // Coordinación de EP y Admin. Funciones en la empresa se calcula en paralelo con el reporte.
  const conFormacion = user.role !== "INSTRUCTOR";
  const conAcademica = user.role === "COORDINADOR" || user.role === "ADMIN";
  const funcionesEmpresa = conFormacion
    ? construirInformeFunciones({ programa: filtros.programa, ficha: filtros.ficha }).catch(() => null)
    : null;
  const r = await construirReporte(filtros);
  const m = r.metricas;
  const soloCoordinacion = Object.entries(filtros).every(([k, v]) => k === "coordinacion" || !v);
  const informe = conFormacion
    ? await construirInformeInstructores({ coordinacion: filtros.coordinacion, ...(soloCoordinacion ? { reporte: r } : {}) })
    : null;
  const lecturas: { hoja: string; titulo: string; l: LecturaCoordinacion }[] = [];
  if (informe && conFormacion) {
    lecturas.push({
      hoja: "Formación (Res. 4017)",
      titulo: "Resumen y recomendaciones para la Coordinación de Formación",
      l: lecturaFormacion(r, informe, await funcionesEmpresa),
    });
  }
  if (informe && conAcademica) {
    lecturas.push({
      hoja: "Académica (Res. 4016)",
      titulo: "Resumen y recomendaciones para la Coordinación Académica",
      l: lecturaAcademica(r, informe),
    });
  }

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
      texto(porcentaje(m.bitacoras.aTiempo, m.bitacoras.aTiempo + m.bitacoras.conAtraso)),
      texto(
        `${m.bitacoras.aTiempo} de ${m.bitacoras.aTiempo + m.bitacoras.conAtraso}; ${m.bitacoras.conAtraso} con atraso` +
          (m.bitacoras.cargaInicial ? `; sin contar ${m.bitacoras.cargaInicial} de la carga inicial` : ""),
      ),
    ],
    [texto("Bitácoras aprobadas"), numero(m.bitacoras.aprobadas), null],
    [
      texto("Rúbrica en «Satisfactorio» (Momentos 2 y 3)"),
      texto(porcentaje(m.rubrica.satisfactorio, m.rubrica.valoradas)),
      texto(`${m.rubrica.satisfactorio} de ${m.rubrica.valoradas} variables valoradas`),
    ],
    [texto("Juicio final aprobado (Momento 3)"), numero(m.momento3.aprobados), null],
    [texto("Juicio final no aprobado (Momento 3)"), numero(m.momento3.noAprobados), null],
    [
      texto("Novedades registradas (§9.2)"),
      numero(m.novedades.total),
      texto(`${m.novedades.fueraDePlazo} registradas fuera de los 3 días hábiles`),
    ],
    [
      texto("Novedades sin anotar en bitácora"),
      numero(m.novedades.sinAnotarEnBitacora),
      texto("Plazo de 5 días hábiles"),
    ],
    [
      texto("Planes de mejoramiento (§9.4)"),
      numero(m.planesMejoramiento.total),
      texto(
        `${m.planesMejoramiento.abiertos} sin cerrar; ${m.planesMejoramiento.vencidos} con el plazo vencido; ${m.planesMejoramiento.noCumplidos} no cumplidos`,
      ),
    ],
    [
      texto("Aprendices fuera del plazo de 24 meses"),
      numero(m.alertas.plazo24Meses),
      texto("Acuerdo 007 de 2012; solo advertencia"),
    ],
    [
      texto("Instructores sobre el tope de 80"),
      numero(m.alertas.instructoresSobreTope),
      texto("Aprendices activos en todo el centro, sin filtrar"),
    ],
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
      "Sede",
      "NIT",
      "Instructor",
      "Coordinación",
      "Estado",
      "Inicio EP",
      "Fin EP",
      "Bitácoras aprobadas",
      "Bitácoras previstas",
      "Novedades",
      "Novedades fuera de plazo",
      "Novedades sin anotar",
      "Planes de mejoramiento",
      "Planes sin cerrar",
      "Planes no cumplidos",
      "Alerta de plazo (24 meses)",
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
      texto(a.sede),
      texto(a.nit),
      texto(a.instructor),
      texto(a.coordinacion),
      texto(a.estado),
      fecha(a.inicioEP),
      fecha(a.finEP),
      numero(a.bitacorasAprobadas),
      numero(a.totalBitacoras),
      numero(a.novedades),
      numero(a.novedadesFueraDePlazo),
      numero(a.novedadesSinAnotar),
      numero(a.planesMejoramiento),
      numero(a.planesAbiertos),
      numero(a.planesNoCumplidos),
      texto(a.advertenciaPlazo),
      texto(a.momento1),
      texto(a.momento2),
      texto(a.momento3),
      texto(a.certificacion),
    ]),
  ];

  // Los dos consolidados nuevos: mismas cifras, cortadas por ficha y por programa.
  const filasConsolidado = (
    filas: typeof r.consolidado.porFicha,
    primera: string,
  ) => [
    [
      primera,
      "Aprendices",
      "Con atrasos",
      "Por certificar",
      "Certificados",
      "Bitácoras aprobadas",
      "Bitácoras previstas",
      "Rúbrica satisfactoria",
      "Variables valoradas",
      "Momento 3 aprobados",
      "Momento 3 no aprobados",
      "Novedades",
      "Novedades fuera de plazo",
      "Planes de mejoramiento abiertos",
    ].map(negrita),
    ...filas.map((f) => [
      texto(f.etiqueta),
      numero(f.aprendices),
      numero(f.conAtrasos),
      numero(f.porCertificar),
      numero(f.certificados),
      numero(f.bitacorasAprobadas),
      numero(f.bitacorasPrevistas),
      texto(f.rubricaValoradas === 0 ? "" : porcentaje(f.rubricaSatisfactorio, f.rubricaValoradas)),
      numero(f.rubricaValoradas),
      numero(f.momento3Aprobados),
      numero(f.momento3NoAprobados),
      numero(f.novedades),
      numero(f.novedadesFueraDePlazo),
      numero(f.planesAbiertos),
    ]),
  ];

  const TONO = { bien: "✓ Bien", regular: "! Revisar", atencion: "! Pide acción", neutro: "· Informativo" } as const;
  const hojaLectura = ({ titulo, l }: { titulo: string; l: LecturaCoordinacion }) => [
    [negrita(titulo), null, null, null, null],
    [texto(l.resolucion), texto(l.nota), null, null, null],
    [texto("Generado"), texto(`${formatoMomento(r.generado)} · ${describirFiltros(r)}`), null, null, null],
    [texto("Resumen"), texto(l.resumen), null, null, null],
    [null, null, null, null, null],
    [negrita("Artículo"), negrita("Frente de gestión"), negrita("Cifra"), negrita("Detalle"), negrita("Lectura")],
    ...l.items.map((i) => [
      texto(i.funcion),
      texto(i.titulo),
      texto(i.cifra),
      texto(i.detalle),
      texto(`${TONO[i.lectura.tono]}: ${i.lectura.texto}`),
    ]),
    [null, null, null, null, null],
    [negrita("Recomendaciones"), null, null, null, null],
    [negrita("N°"), negrita("Prioridad"), negrita("Artículo"), negrita("Recomendación"), null],
    ...(l.recomendaciones.length
      ? l.recomendaciones.map((x, k) => [numero(k + 1), texto(x.urgente ? "Prioridad" : "Normal"), texto(x.funcion), texto(x.texto), null])
      : [[null, null, null, texto("Con las cifras de hoy ningún frente pide recomendaciones."), null]]),
    [null, null, null, null, null],
    [negrita("Lo que SEPA no mide (no se estima)"), null, null, null, null],
    ...l.noMide.map((t) => [null, null, null, texto(t), null]),
  ];

  const ancho = (...w: number[]) => w.map((width) => ({ width }));
  const archivo = await writeExcelFile([
    { data: metricas, sheet: "Métricas", columns: ancho(44, 22, 48) },
    { data: cumplimiento, sheet: "Cumplimiento", columns: ancho(32, 12, 12, 18, 12) },
    { data: enRiesgo, sheet: "En riesgo", columns: ancho(32, 14, 28, 60, 60) },
    {
      data: filasConsolidado(r.consolidado.porFicha, "Ficha"),
      sheet: "Por ficha",
      columns: ancho(18, 12, 12, 14, 12, 18, 18, 20, 18, 18, 20, 12, 20, 26),
    },
    {
      data: filasConsolidado(r.consolidado.porPrograma, "Programa"),
      sheet: "Por programa",
      columns: ancho(40, 12, 12, 14, 12, 18, 18, 20, 18, 18, 20, 12, 20, 26),
    },
    {
      data: aprendices,
      sheet: "Aprendices",
      columns: ancho(32, 16, 14, 30, 28, 22, 16, 28, 20, 12, 12, 12, 12, 12, 16, 16, 20, 16, 18, 40, 14, 24, 24, 16),
    },
    ...lecturas.map((x) => ({ data: hojaLectura(x), sheet: x.hoja, columns: ancho(16, 34, 14, 80, 60) })),
  ]).toBuffer();

  return new Response(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-sepa-${fechaEnColombia(r.generado)}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
