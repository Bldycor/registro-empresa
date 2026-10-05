// Redacción del resumen semanal para Coordinación (cada lunes; decisión de Coordinación, 4 oct
// 2026). Función pura —sin imports ni variables de entorno—, igual que `componerAvisoPlazos`: en
// local el correo no se puede enviar, así que esta es la parte que se prueba antes de producción.

export type DatosResumenSemanal = {
  alternativas: { pendientes: number; fueraDePlazo: number };
  interrupciones: number;
  aplazamientos: number;
  planesPorAutorizar: number;
  porCertificar: number;
  aprendicesActivos: number;
  enRiesgo: { nombre: string; ficha: string | null; motivo: string }[];
};

export type EnlacesResumen = {
  alternativas: string;
  interrupciones: string;
  aplazamientos: string;
  planes: string;
  reportes: string;
};

function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const MAXIMO_EN_LISTA = 10;

export function componerResumenSemanal(params: {
  nombre: string;
  semana: string; // "lunes 5 de octubre de 2026"
  datos: DatosResumenSemanal;
  enlaces: EnlacesResumen;
}) {
  const { datos: d, enlaces: e } = params;
  const filas: { etiqueta: string; valor: number; nota?: string; enlace: string }[] = [
    {
      etiqueta: "Alternativas EP por avalar",
      valor: d.alternativas.pendientes,
      nota: d.alternativas.fueraDePlazo ? `${d.alternativas.fueraDePlazo} pasan de los 8 días hábiles` : undefined,
      enlace: e.alternativas,
    },
    { etiqueta: "Interrupciones por resolver", valor: d.interrupciones, enlace: e.interrupciones },
    { etiqueta: "Aplazamientos por registrar", valor: d.aplazamientos, enlace: e.aplazamientos },
    { etiqueta: "Planes de mejoramiento por autorizar", valor: d.planesPorAutorizar, enlace: e.planes },
    { etiqueta: "Aprendices por certificar", valor: d.porCertificar, enlace: e.reportes },
  ];
  const pendientes = filas.slice(0, 4).reduce((s, f) => s + f.valor, 0);
  const riesgo = d.enRiesgo.length;

  const subject =
    pendientes === 0 && riesgo === 0
      ? "SEPA · Resumen semanal: sin pendientes"
      : `SEPA · Resumen semanal: ${pendientes} pendiente${pendientes === 1 ? "" : "s"} y ${riesgo} ${riesgo === 1 ? "aprendiz" : "aprendices"} en riesgo`;

  const listaRiesgo = d.enRiesgo.slice(0, MAXIMO_EN_LISTA);
  const resto = riesgo - listaRiesgo.length;

  const text = [
    `Hola, ${params.nombre}:`,
    "",
    `Este es el resumen de la Etapa Productiva para la semana del ${params.semana}.`,
    "",
    ...filas.map((f) => `- ${f.etiqueta}: ${f.valor}${f.nota ? ` (${f.nota})` : ""}`),
    "",
    `Aprendices en riesgo (evidencias atrasadas o causal de deserción): ${riesgo} de ${d.aprendicesActivos} activos.`,
    ...listaRiesgo.map((a) => `  · ${a.nombre}${a.ficha ? ` (ficha ${a.ficha})` : ""}: ${a.motivo}`),
    ...(resto > 0 ? [`  · y ${resto} más: ver Reportes.`] : []),
    "",
    `Reportes: ${e.reportes}`,
    "",
    "Este correo sale solo cada lunes. Los números son los del momento del envío.",
  ].join("\n");

  const celda = "padding:8px 12px;border-bottom:1px solid #e3e8e0;font-size:14px;";
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#f5f7f2;font-family:Arial,Helvetica,sans-serif;color:#14283a">
<div style="max-width:620px;margin:0 auto;padding:24px">
<div style="background:#00304d;color:#f5f7f2;border-radius:12px 12px 0 0;padding:20px 24px">
<p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#9fe07a">SEPA · Resumen semanal</p>
<p style="margin:6px 0 0;font-size:20px;font-weight:bold">Semana del ${escaparHtml(params.semana)}</p>
</div>
<div style="background:#ffffff;border:1px solid #dde3da;border-top:none;border-radius:0 0 12px 12px;padding:24px">
<p style="margin:0 0 16px;font-size:15px">Hola, ${escaparHtml(params.nombre)}. Esto es lo que espera la acción de Coordinación:</p>
<table style="width:100%;border-collapse:collapse">
${filas
  .map(
    (f) => `<tr><td style="${celda}"><a href="${escaparHtml(f.enlace)}" style="color:#00304d">${escaparHtml(f.etiqueta)}</a>${
      f.nota ? `<br><span style="color:#a15c00;font-size:12px">${escaparHtml(f.nota)}</span>` : ""
    }</td><td style="${celda}text-align:right;font-weight:bold;font-size:18px">${f.valor}</td></tr>`,
  )
  .join("\n")}
</table>
<p style="margin:24px 0 8px;font-size:15px;font-weight:bold">Aprendices en riesgo: ${riesgo} de ${d.aprendicesActivos} activos</p>
${
  riesgo === 0
    ? `<p style="margin:0;font-size:14px;color:#4a5a66">Nadie tiene evidencias atrasadas ni causal de deserción.</p>`
    : `<ul style="margin:0;padding-left:18px;font-size:14px;color:#3c4b57">${listaRiesgo
        .map((a) => `<li style="margin:4px 0"><b>${escaparHtml(a.nombre)}</b>${a.ficha ? ` · ficha ${escaparHtml(a.ficha)}` : ""}: ${escaparHtml(a.motivo)}</li>`)
        .join("")}${resto > 0 ? `<li style="margin:4px 0">y ${resto} más</li>` : ""}</ul>`
}
<p style="margin:24px 0 0"><a href="${escaparHtml(e.reportes)}" style="display:inline-block;background:#39a900;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">Abrir Reportes</a></p>
<p style="margin:16px 0 0;font-size:12px;color:#6b7a86">Este correo sale solo cada lunes. Los números son los del momento del envío.</p>
</div></div></body></html>`;

  return { subject, text, html };
}
