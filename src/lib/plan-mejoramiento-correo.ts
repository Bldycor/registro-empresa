// Redacción del correo con el que Coordinación le comunica al aprendiz el plan de mejoramiento
// autorizado, separada del envío (`sendPlanMejoramientoEmail` en src/lib/mailer.ts). Es una
// función pura —sin imports ni variables de entorno—, que es lo único de este correo que se puede
// probar fuera de producción.
//
// El Acuerdo 009 dice que el plan se comunica por escrito y lo firman el aprendiz y el coordinador
// académico. Este correo es esa comunicación: lleva el contenido completo del plan y su fecha
// límite, y recuerda que el escrito se firma. Va al aprendiz con copia al instructor que lo
// redactó, porque la verificación es suya.

export function componerPlanMejoramiento(params: {
  aprendizNombre: string;
  aprendizEmail: string;
  instructorEmail: string | null;
  momento: number;
  resultadosNoSuperados: string;
  actividades: string;
  evidencias: string;
  fechaLimite: Date;
  diasPlazo: number;
  autorizadoPor: string;
  observacionesCoordinacion: string | null;
  appUrl: string;
}): { to: string; cc: string[]; subject: string; text: string; html: string } {
  const {
    aprendizNombre,
    aprendizEmail,
    instructorEmail,
    momento,
    resultadosNoSuperados,
    actividades,
    evidencias,
    fechaLimite,
    diasPlazo,
    autorizadoPor,
    observacionesCoordinacion,
    appUrl,
  } = params;

  const escapar = (texto: string) =>
    texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Día de calendario guardado a medianoche UTC: se muestra en UTC.
  const fecha = fechaLimite.toLocaleDateString("es-CO", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const propio = aprendizEmail.trim().toLowerCase();
  const instructor = (instructorEmail ?? "").trim();
  const cc = instructor && instructor.toLowerCase() !== propio ? [instructor] : [];

  const bloques: [string, string][] = [
    ["Resultados de aprendizaje por superar", resultadosNoSuperados],
    ["Actividades de aprendizaje", actividades],
    ["Evidencias que debes presentar", evidencias],
  ];

  const subject = `Plan de mejoramiento del Momento ${momento} — ${aprendizNombre}`;

  const text = [
    `Hola ${aprendizNombre},`,
    "",
    `La coordinación académica autorizó un plan de mejoramiento para tu Momento ${momento} de evaluación.`,
    `Tienes ${diasPlazo} ${diasPlazo === 1 ? "día" : "días"} calendario: la fecha límite es el ${fecha}.`,
    "",
    ...bloques.flatMap(([titulo, cuerpo]) => [`${titulo}:`, cuerpo, ""]),
    ...(observacionesCoordinacion ? [`Observaciones de coordinación: ${observacionesCoordinacion}`, ""] : []),
    "El plan debe quedar firmado por ti y por el coordinador académico; tu instructor verifica su cumplimiento.",
    "",
    `Puedes consultarlo en la plataforma: ${appUrl}`,
    "",
    `Autorizado por ${autorizadoPor}.`,
  ].join("\n");

  const html = [
    `<p>Hola ${escapar(aprendizNombre)},</p>`,
    `<p>La coordinación académica autorizó un <strong>plan de mejoramiento</strong> para tu Momento ${momento} de evaluación.</p>`,
    `<p>Tienes <strong>${diasPlazo} ${diasPlazo === 1 ? "día" : "días"} calendario</strong>: la fecha límite es el <strong>${escapar(fecha)}</strong>.</p>`,
    ...bloques.map(
      ([titulo, cuerpo]) =>
        `<p><strong>${escapar(titulo)}</strong><br>${escapar(cuerpo).replace(/\n/g, "<br>")}</p>`,
    ),
    observacionesCoordinacion
      ? `<p><strong>Observaciones de coordinación</strong><br>${escapar(observacionesCoordinacion).replace(/\n/g, "<br>")}</p>`
      : "",
    "<p>El plan debe quedar firmado por ti y por el coordinador académico; tu instructor verifica su cumplimiento.</p>",
    `<p><a href="${escapar(appUrl)}">Consultarlo en la plataforma</a>.</p>`,
    `<p style="color:#666">Autorizado por ${escapar(autorizadoPor)}.</p>`,
  ]
    .filter(Boolean)
    .join("\n");

  return { to: aprendizEmail, cc, subject, text, html };
}
