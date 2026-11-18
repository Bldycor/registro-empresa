// Lectura de los indicadores de Etapa Productiva según las funciones de cada coordinación
// (18 nov 2026, pedido del usuario con las resoluciones del SENA):
// - Coordinación de Formación: Res. 4017 de 2009, art. 2 y 3 (vigentes; la Res. 1565 de 2023 solo
//   modificó el art. 4).
// - Coordinación Académica: Res. 4016 de 2009, art. 2 en su texto original. La Res. 1625 de 2018
//   remitió esas funciones al manual específico de funciones; aquí se usan como referencia y la
//   pantalla lo dice.
// Funciones puras sobre cifras que SEPA ya calcula: no consultan la base ni inventan datos. Lo que
// SEPA no registra se dice en `noMide`, no se estima.

import type { Reporte } from "@/lib/reportes";
import type { InformeInstructores } from "@/lib/informe-instructores";
import type { InformeFunciones } from "@/lib/informe-funciones";
import { lecturaAlDia, lecturaCertificados, lecturaRubrica, type Lectura } from "@/lib/lectura-indicadores";

export type ItemFuncion = {
  // Dónde está la función en la resolución, p. ej. «Art. 2 · 5e».
  funcion: string;
  titulo: string;
  cifra: string;
  detalle: string;
  lectura: Lectura;
  href?: string;
};
export type Recomendacion = { funcion: string; texto: string; urgente: boolean };
export type LecturaCoordinacion = {
  resolucion: string;
  nota: string;
  resumen: string;
  items: ItemFuncion[];
  recomendaciones: Recomendacion[];
  noMide: string[];
};

const pct = (parte: number, total: number) => (total ? Math.round((parte / total) * 100) : 0);
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

function devueltasTexto(d: Reporte["metricas"]["gestionEP"]["devueltas"]): { total: number; texto: string } {
  const partes = [
    [d.bitacoras, "bitácora", "bitácoras"],
    [d.formalizacion, "formalización", "formalizaciones"],
    [d.alternativa, "alternativa", "alternativas"],
    [d.certificacion, "certificación", "certificaciones"],
  ] as const;
  const total = partes.reduce((t, [n]) => t + n, 0);
  const texto = partes.filter(([n]) => n > 0).map(([n, u, v]) => plural(n, u, v)).join(", ");
  return { total, texto: texto || "Ninguna" };
}

function resumir(items: ItemFuncion[]): string {
  const cuenta = (tono: Lectura["tono"]) => items.filter((i) => i.lectura.tono === tono).length;
  const [accion, revisar, bien] = [cuenta("atencion"), cuenta("regular"), cuenta("bien")];
  const partes = [
    accion ? `${accion} ${accion === 1 ? "pide" : "piden"} acción` : "",
    revisar ? `${revisar} conviene${revisar === 1 ? "" : "n"} revisar` : "",
    bien ? `${bien} ${bien === 1 ? "va" : "van"} bien` : "",
  ].filter(Boolean);
  if (!accion && !revisar) return `De ${items.length} frentes de gestión, ninguno pide acción hoy${bien ? ` y ${partes[0]}` : ""}.`;
  return `De ${items.length} frentes de gestión, ${partes.join(", ").replace(/, ([^,]*)$/, " y $1")}.`;
}

// ---- Coordinación de Formación (Res. 4017 de 2009) ----------------------------------------------

export function lecturaFormacion(r: Reporte, informe: InformeInstructores, funciones: InformeFunciones | null): LecturaCoordinacion {
  const m = r.metricas;
  const s = m.semaforo;
  const g = m.gestionEP;
  const enPractica = s.alDia + s.enRiesgo;
  const items: ItemFuncion[] = [];
  const rec: Recomendacion[] = [];

  // 3b. Informes de seguimiento periódico a la ejecución de los programas.
  items.push({
    funcion: "Art. 2 · 3b",
    titulo: "Seguimiento a la ejecución",
    cifra: `${s.alDia} de ${enPractica}`,
    detalle: [
      "aprendices en práctica van al día.",
      s.sinIniciar ? `${plural(s.sinIniciar, "aprendiz activo sigue", "aprendices activos siguen")} sin fecha de inicio de EP.` : "",
      s.enPausa ? `${s.enPausa} en pausa (interrumpida, aplazada o desertó).` : "",
    ]
      .filter(Boolean)
      .join(" "),
    lectura: lecturaAlDia(s.alDia, enPractica),
  });
  if (s.enRiesgo) {
    rec.push({
      funcion: "Art. 2 · 3b",
      urgente: pct(s.enRiesgo, enPractica) >= 30,
      texto: `${plural(s.enRiesgo, "aprendiz necesita", "aprendices necesitan")} atención (${pct(s.enRiesgo, enPractica)} % de los que están en práctica). Incluir${s.enRiesgo === 1 ? "lo" : "los"} en el informe periódico al Subdirector con la lista «Quiénes requieren atención» de este tablero.`,
    });
  }

  // 2. Convenios y alianzas: las empresas que hoy forman a los aprendices.
  const top = g.empresas.principales[0];
  const concentracion = top && g.empresas.aprendices ? pct(top.aprendices, g.empresas.aprendices) : 0;
  items.push({
    funcion: "Art. 2 · 2",
    titulo: "Empresas que forman",
    cifra: String(g.empresas.total),
    detalle: g.empresas.total
      ? `${plural(g.empresas.total, "empresa forma", "empresas forman")} a ${plural(g.empresas.aprendices, "aprendiz", "aprendices")} que ya iniciaron la EP. Principales: ${g.empresas.principales.map((e) => `${e.nombre} (${e.aprendices})`).join(", ")}.`
      : "Ningún aprendiz con etapa productiva iniciada tiene empresa registrada.",
    lectura:
      g.empresas.total && concentracion >= 50 && g.empresas.aprendices >= 4
        ? { tono: "regular", texto: `Una sola empresa concentra el ${concentracion} % de los aprendices en práctica.` }
        : { tono: "neutro", texto: "Base de empresas aliadas, tomada de los registros de SEPA." },
  });
  if (g.empresas.total && concentracion >= 50 && g.empresas.aprendices >= 4) {
    rec.push({
      funcion: "Art. 2 · 2",
      urgente: false,
      texto: `${top.nombre} recibe el ${concentracion} % de los aprendices en práctica. Ampliar la base de empresas aliadas reduce el riesgo de que un cambio en esa empresa deje a muchos aprendices sin práctica.`,
    });
  }

  // 5e. Contrato de aprendizaje.
  const conAlternativa = g.alternativas.reduce((t, a) => t + a.cantidad, 0);
  const contrato = g.alternativas.find((a) => a.tipo === "CONTRATO_APRENDIZAJE")?.cantidad ?? 0;
  items.push({
    funcion: "Art. 2 · 5e",
    titulo: "Contrato de aprendizaje",
    cifra: `${contrato} de ${conAlternativa}`,
    detalle: conAlternativa
      ? `alternativas avaladas son contrato de aprendizaje. Todas: ${g.alternativas.map((a) => `${a.etiqueta} ${a.cantidad}`).join(" · ")}.${g.alternativasPendientes ? ` ${plural(g.alternativasPendientes, "alternativa espera", "alternativas esperan")} aval.` : ""}`
      : "Aún no hay alternativas avaladas con estos filtros.",
    lectura: { tono: "neutro", texto: "Insumo para mantener actualizado el sistema de información del contrato de aprendizaje." },
  });

  // 4a. Diseño curricular: funciones en la empresa frente a las competencias del programa.
  const cob = funciones?.kpi.cobertura;
  if (cob && cob.total) {
    const sinRelacion = pct(cob.ninguna, cob.total);
    items.push({
      funcion: "Art. 2 · 4a",
      titulo: "Pertinencia del diseño curricular",
      cifra: `${sinRelacion} %`,
      detalle: `de ${plural(cob.total, "función", "funciones")} que los aprendices hacen en la empresa no se parece a ninguna competencia técnica del programa.`,
      lectura:
        sinRelacion >= 30
          ? { tono: "atencion", texto: "Brecha entre lo que pide la empresa y lo que forma el programa." }
          : sinRelacion >= 15
            ? { tono: "regular", texto: "Hay funciones que el programa no contempla." }
            : { tono: "bien", texto: "Lo que hacen en la empresa corresponde al programa." },
      href: "/formulario/reportes/funciones",
    });
    if (sinRelacion >= 15) {
      rec.push({
        funcion: "Art. 2 · 4a",
        urgente: sinRelacion >= 30,
        texto: `El ${sinRelacion} % de las funciones que se ejercen en la empresa no corresponde a competencias técnicas del programa. Con el informe «Funciones en la empresa», proponer al Subdirector y a la Red tecnológica revisar o actualizar el diseño curricular.`,
      });
    }
  }

  // 8 (a, c, d). Mejora continua: calidad del proceso y lo que la afecta.
  const rub = m.rubrica;
  const devueltas = devueltasTexto(g.devueltas);
  items.push({
    funcion: "Art. 2 · 8",
    titulo: "Calidad y mejora continua",
    cifra: rub.valoradas ? `${pct(rub.satisfactorio, rub.valoradas)} %` : "—",
    detalle: `de los criterios de la rúbrica salió «Satisfactorio». Planes de mejoramiento abiertos: ${m.planesMejoramiento.abiertos}${m.planesMejoramiento.vencidos ? ` (${m.planesMejoramiento.vencidos} con el plazo vencido)` : ""}. Evidencias devueltas hoy: ${devueltas.texto}.`,
    lectura: rub.valoradas ? lecturaRubrica(rub.satisfactorio, rub.valoradas) : { tono: "neutro", texto: "Aún no hay criterios valorados." },
  });
  if (m.planesMejoramiento.vencidos) {
    rec.push({
      funcion: "Art. 2 · 8c",
      urgente: true,
      texto: `${plural(m.planesMejoramiento.vencidos, "plan de mejoramiento tiene", "planes de mejoramiento tienen")} el plazo vencido. Coordinar con los instructores su cierre para minimizar la materialización del riesgo.`,
    });
  }
  const criterioBajo = [...rub.porCriterio].filter((c) => c.satisfactorio + c.porMejorar > 0).sort(
    (a, b) => a.satisfactorio / (a.satisfactorio + a.porMejorar) - b.satisfactorio / (b.satisfactorio + b.porMejorar),
  )[0];
  if (criterioBajo && criterioBajo.porMejorar > 0) {
    rec.push({
      funcion: "Art. 2 · 8d",
      urgente: false,
      texto: `El criterio con más «Por mejorar» es «${criterioBajo.etiqueta}» (${criterioBajo.porMejorar} de ${criterioBajo.satisfactorio + criterioBajo.porMejorar}). Es un aspecto que afecta la calidad: registrarlo y analizarlo con los equipos ejecutores.`,
    });
  }
  if (devueltas.total) {
    rec.push({
      funcion: "Art. 2 · 8d",
      urgente: false,
      texto: `Hoy hay ${devueltas.total} evidencias devueltas al aprendiz (${devueltas.texto}). Si se repite el mismo motivo, conviene una orientación general a los aprendices en lugar de corregir caso por caso.`,
    });
  }

  // Administración educativa f. Certificación oportuna.
  items.push({
    funcion: "Parágrafo · f",
    titulo: "Certificación oportuna",
    cifra: String(s.porCertificar),
    detalle: `${s.porCertificar === 1 ? "aprendiz terminó" : "aprendices terminaron"} las seis evidencias y espera${s.porCertificar === 1 ? "" : "n"} certificación. Certificados: ${s.certificados}.`,
    lectura: lecturaCertificados(s.certificados, s.porCertificar),
  });
  if (s.porCertificar) {
    rec.push({
      funcion: "Parágrafo · f",
      urgente: s.porCertificar >= 5,
      texto: `${plural(s.porCertificar, "aprendiz ya completó", "aprendices ya completaron")} la etapa productiva y espera${s.porCertificar === 1 ? "" : "n"} certificación. Gestionar con Administración Educativa la certificación oportuna.`,
    });
  }

  // Art. 3 · 5. Veracidad de los registros.
  const nov = m.novedades;
  const faltantes = s.sinIniciar + nov.fueraDePlazo + nov.sinAnotarEnBitacora;
  items.push({
    funcion: "Art. 3 · 5",
    titulo: "Registros confiables",
    cifra: String(faltantes),
    detalle: `registros por completar: ${s.sinIniciar} sin fecha de inicio de EP, ${nov.fueraDePlazo} novedades registradas fuera de plazo y ${nov.sinAnotarEnBitacora} sin anotar en bitácora.`,
    lectura: !faltantes
      ? { tono: "bien", texto: "Los registros están completos." }
      : { tono: faltantes >= 5 ? "atencion" : "regular", texto: "Información incompleta o tardía resta veracidad a los informes." },
  });
  if (s.sinIniciar) {
    rec.push({
      funcion: "Art. 3 · 5",
      urgente: false,
      texto: `${plural(s.sinIniciar, "aprendiz activo no tiene", "aprendices activos no tienen")} fecha de inicio de etapa productiva. Sin ese dato no se miden sus plazos: pedir a Coordinación de EP completarlo.`,
    });
  }

  // Acompañamiento a instructores, que se informa al Subdirector (art. 3 · 2).
  if (informe.centro.demoradas) {
    rec.push({
      funcion: "Art. 3 · 2",
      urgente: informe.centro.demoradas >= 5,
      texto: `${plural(informe.centro.demoradas, "revisión lleva", "revisiones llevan")} más de ${informe.plazoRevision} días hábiles esperando al instructor. Detalle en «Gestión de instructores».`,
    });
  }

  rec.sort((a, b) => Number(b.urgente) - Number(a.urgente));
  return {
    resolucion: "Resolución 4017 de 2009",
    nota: "Funciones del Grupo de Formación Integral (art. 2) y de su coordinador (art. 3), vigentes. Cada frente usa solo lo que SEPA registra de la Etapa Productiva.",
    resumen: resumir(items),
    items,
    recomendaciones: rec,
    noMide: [
      "Satisfacción de empresarios y aprendices (art. 2 · 8a): SEPA no aplica encuestas de satisfacción.",
      "Seguimiento a egresados (art. 2 · 1c): SEPA llega hasta la certificación.",
      "Apoyos de sostenimiento y bienestar (art. 2 · 5a y 5d), auditorías (8b) e integración con la media (2b).",
    ],
  };
}

// ---- Coordinación Académica (Res. 4016 de 2009) -------------------------------------------------

export function lecturaAcademica(r: Reporte, informe: InformeInstructores): LecturaCoordinacion {
  const m = r.metricas;
  const s = m.semaforo;
  const g = m.gestionEP;
  const c = informe.centro;
  const items: ItemFuncion[] = [];
  const rec: Recomendacion[] = [];

  // 2.7 Registro oportuno de la evaluación y las novedades.
  const sinValorar = c.momentosRealizados - c.momentosValorados;
  const nov = m.novedades;
  items.push({
    funcion: "2.7",
    titulo: "Registro oportuno",
    cifra: `${c.momentosValorados} de ${c.momentosRealizados}`,
    detalle: `momentos realizados están valorados. Novedades: ${nov.total}, ${nov.fueraDePlazo} fuera de plazo y ${nov.sinAnotarEnBitacora} sin anotar en bitácora.`,
    lectura:
      !c.momentosRealizados && !nov.total
        ? { tono: "neutro", texto: "Aún no hay momentos ni novedades." }
        : sinValorar || nov.fueraDePlazo
          ? { tono: sinValorar / Math.max(1, c.momentosRealizados) > 0.3 ? "atencion" : "regular", texto: "Hay evaluaciones o novedades sin registrar a tiempo." }
          : { tono: "bien", texto: "Evaluaciones y novedades al día." },
  });
  if (sinValorar) {
    rec.push({
      funcion: "2.7",
      urgente: sinValorar >= 3,
      texto: `${plural(sinValorar, "momento ya realizado sigue", "momentos ya realizados siguen")} sin valorar. Pedir a los instructores registrar la valoración: es la evidencia de la evaluación del aprendiz.`,
    });
  }
  if (nov.fueraDePlazo || nov.sinAnotarEnBitacora) {
    rec.push({
      funcion: "2.7",
      urgente: false,
      texto: `${plural(nov.fueraDePlazo, "novedad se registró", "novedades se registraron")} después de los 3 días hábiles y ${nov.sinAnotarEnBitacora} sigue${nov.sinAnotarEnBitacora === 1 ? "" : "n"} sin anotar en bitácora. Recordar el plazo de la guía GFPI-G-040 §9.2.`,
    });
  }

  // 2.8 Acompañamiento pedagógico y metodológico a los instructores.
  const conAtencion = informe.instructores.filter((i) => i.atencion > 0).length;
  items.push({
    funcion: "2.8",
    titulo: "Acompañamiento a instructores",
    cifra: `${conAtencion} de ${c.instructores}`,
    detalle: `instructores tienen al menos un frente que pide acción. Revisiones en espera: ${c.pendientes}, ${c.demoradas} con más de ${informe.plazoRevision} días hábiles.`,
    lectura: !c.instructores
      ? { tono: "neutro", texto: "No hay instructores con fichas en este corte." }
      : conAtencion
        ? { tono: pct(conAtencion, c.instructores) >= 50 ? "atencion" : "regular", texto: "Hay instructores que necesitan apoyo." }
        : { tono: "bien", texto: "Ningún instructor tiene frentes que pidan acción." },
    href: "/formulario/reportes/instructores",
  });
  if (conAtencion) {
    const primero = informe.instructores.find((i) => i.atencion > 0);
    rec.push({
      funcion: "2.8",
      urgente: c.demoradas >= 5,
      texto: `Priorizar el acompañamiento a ${plural(conAtencion, "instructor", "instructores")}${primero ? `, empezando por ${primero.nombre}` : ""}. «Gestión de instructores» los ordena de quien más necesita apoyo a quien menos.`,
    });
  }

  // 2.9 Seguimiento y evaluación con el Comité de Evaluación y Seguimiento.
  const planes = m.planesMejoramiento;
  const comite = planes.noCumplidos + m.momento3.noAprobados;
  items.push({
    funcion: "2.9",
    titulo: "Casos para el Comité de Evaluación y Seguimiento",
    cifra: String(comite),
    detalle: `${plural(planes.noCumplidos, "plan de mejoramiento no cumplido", "planes de mejoramiento no cumplidos")} y ${plural(m.momento3.noAprobados, "juicio del Momento 3 no aprobado", "juicios del Momento 3 no aprobados")}. Además, ${plural(s.enRiesgo, "aprendiz necesita", "aprendices necesitan")} atención.`,
    lectura: comite
      ? { tono: "atencion", texto: "Hay casos para llevar a consideración del Comité." }
      : { tono: s.enRiesgo ? "regular" : "bien", texto: s.enRiesgo ? "Sin casos de Comité, pero hay aprendices por atender." : "Sin casos pendientes de Comité." },
  });
  if (comite) {
    rec.push({
      funcion: "2.9",
      urgente: true,
      texto: `Llevar a consideración del Comité de Evaluación y Seguimiento ${plural(comite, "caso", "casos")}: planes de mejoramiento no cumplidos y juicios no aprobados del Momento 3.`,
    });
  }

  // 2.10 Proponer y validar alternativas para la etapa práctica.
  const conAlternativa = g.alternativas.reduce((t, a) => t + a.cantidad, 0);
  items.push({
    funcion: "2.10",
    titulo: "Alternativas de etapa productiva",
    cifra: String(conAlternativa),
    detalle: conAlternativa
      ? `avaladas: ${g.alternativas.map((a) => `${a.etiqueta} ${a.cantidad}`).join(" · ")}. Esperan aval: ${g.alternativasPendientes}. Devueltas: ${g.devueltas.alternativa}.`
      : `Aún no hay alternativas avaladas. Esperan aval: ${g.alternativasPendientes}.`,
    lectura: g.alternativasPendientes
      ? { tono: "regular", texto: `${plural(g.alternativasPendientes, "alternativa espera", "alternativas esperan")} su validación.` }
      : { tono: "neutro", texto: "Sin alternativas por validar." },
    href: "/formulario/coordinador/alternativas",
  });
  if (g.alternativasPendientes) {
    rec.push({
      funcion: "2.10",
      urgente: g.alternativasPendientes >= 5,
      texto: `Validar ${plural(g.alternativasPendientes, "alternativa pendiente", "alternativas pendientes")}: mientras no se avale, el aprendiz no puede formalizar su etapa productiva.`,
    });
  }

  // 3.3 Aspectos que afectan la calidad del servicio.
  const devueltas = devueltasTexto(g.devueltas);
  const rub = m.rubrica;
  items.push({
    funcion: "3.3",
    titulo: "Aspectos que afectan la calidad",
    cifra: String(devueltas.total),
    detalle: `evidencias devueltas hoy (${devueltas.texto}). Rúbrica «Satisfactorio»: ${rub.valoradas ? `${pct(rub.satisfactorio, rub.valoradas)} %` : "sin valoraciones"}.`,
    lectura: devueltas.total >= 5 ? { tono: "regular", texto: "Muchas evidencias vuelven al aprendiz." } : rub.valoradas ? lecturaRubrica(rub.satisfactorio, rub.valoradas) : { tono: "neutro", texto: "Sin datos de calidad todavía." },
  });
  if (devueltas.total >= 3) {
    rec.push({
      funcion: "3.3",
      urgente: false,
      texto: `${devueltas.total} evidencias están devueltas (${devueltas.texto}). Identificar el motivo más frecuente y orientarlo en la inducción o con los instructores.`,
    });
  }

  // 3.2 Plan de mejoramiento y riesgos.
  if (planes.vencidos) {
    rec.push({
      funcion: "3.2",
      urgente: true,
      texto: `${plural(planes.vencidos, "plan de mejoramiento venció", "planes de mejoramiento vencieron")} sin cerrarse. Hacer seguimiento con el instructor de cada caso.`,
    });
  }

  rec.sort((a, b) => Number(b.urgente) - Number(a.urgente));
  return {
    resolucion: "Resolución 4016 de 2009",
    nota: "Referencia: funciones del art. 2 en su texto original. Desde la Res. 1625 de 2018 las funciones del Coordinador Académico se fijan en el manual específico de funciones del SENA.",
    resumen: resumir(items),
    items,
    recomendaciones: rec,
    noMide: [
      "Satisfacción de empresarios y aprendices (3.1): SEPA no aplica encuestas.",
      "Ruta de aprendizaje, recursos y ambientes de formación (1, 2.5 y 2.6): no se registran en SEPA.",
    ],
  };
}
