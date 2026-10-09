// Cómo se lee cada indicador de Reportes, en palabras (pedido de Coordinación, 9 oct 2026: al
// socializar los números costaba interpretarlos). Funciones puras: reciben las cifras y devuelven
// una frase y un tono. Los umbrales son referencias para leer, no reglas de la guía: ninguno
// bloquea ni cambia nada.

export type Tono = "bien" | "regular" | "atencion" | "neutro";
export type Lectura = { texto: string; tono: Tono };

// «7 de cada 10»: más fácil de imaginar que un porcentaje.
export function deCadaDiez(parte: number, total: number): number {
  return total ? Math.round((parte / total) * 10) : 0;
}

const pct = (parte: number, total: number) => (total ? Math.round((parte / total) * 100) : 0);
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function lecturaAlDia(alDia: number, enPractica: number): Lectura {
  if (!enPractica) return { texto: "No hay aprendices en práctica activa con estos filtros.", tono: "neutro" };
  const p = pct(alDia, enPractica);
  const diez = deCadaDiez(alDia, enPractica);
  if (p >= 80) return { texto: `Buen ritmo: ${diez} de cada 10 aprendices en práctica cumplen sus entregas a tiempo.`, tono: "bien" };
  if (p >= 60)
    return {
      texto: `Aceptable, con margen: ${diez} de cada 10 van al día. Conviene revisar a quienes se están atrasando antes de que se acumule.`,
      tono: "regular",
    };
  return {
    texto: `Atención: solo ${diez} de cada 10 van al día. El seguimiento necesita refuerzo; empieza por la lista de quienes necesitan atención.`,
    tono: "atencion",
  };
}

export function lecturaEnRiesgo(enRiesgo: number, enPractica: number): Lectura {
  if (enRiesgo === 0) return { texto: "Nadie tiene entregas vencidas ni señales de deserción.", tono: "bien" };
  const p = pct(enRiesgo, enPractica);
  return {
    texto: `${plural(enRiesgo, "aprendiz tiene", "aprendices tienen")} algo vencido o una señal de deserción. Son los primeros a contactar: la lista dice qué le falta a cada uno.`,
    tono: p >= 30 ? "atencion" : "regular",
  };
}

export function lecturaCertificados(certificados: number, porCertificar: number): Lectura {
  if (certificados === 0 && porCertificar === 0)
    return { texto: "Aún nadie termina: es normal mientras las prácticas siguen en curso.", tono: "neutro" };
  const partes = [
    certificados ? `${plural(certificados, "aprendiz ya terminó", "aprendices ya terminaron")} todo el proceso` : null,
    porCertificar
      ? `${plural(porCertificar, "completó", "completaron")} las seis evidencias y ${porCertificar === 1 ? "espera" : "esperan"} la certificación, que Coordinación expide fuera de SEPA`
      : null,
  ].filter(Boolean);
  return { texto: `${partes.join("; ")}.`.replace(/^./, (c) => c.toUpperCase()), tono: "bien" };
}

export function lecturaBitacorasATiempo(aTiempo: number, entregadas: number): Lectura {
  if (!entregadas) return { texto: "Todavía no hay bitácoras entregadas.", tono: "neutro" };
  const diez = deCadaDiez(aTiempo, entregadas);
  const p = pct(aTiempo, entregadas);
  if (p >= 80) return { texto: `Buena puntualidad: ${diez} de cada 10 bitácoras llegan a tiempo.`, tono: "bien" };
  if (p >= 50)
    return { texto: `${diez} de cada 10 llegan a tiempo; varias llegan tarde. Conviene recordar las fechas límite.`, tono: "regular" };
  return {
    texto: `Solo ${aTiempo} de ${entregadas} llegó a tiempo. Conviene recordar a los aprendices sus fechas límite; SEPA ya les envía avisos por correo.`,
    tono: "atencion",
  };
}

export function lecturaBitacorasAprobadas(aprobadas: number, entregadas: number): Lectura {
  if (!entregadas) return { texto: "Todavía no hay bitácoras para revisar.", tono: "neutro" };
  const sinAval = Math.max(0, entregadas - aprobadas);
  if (sinAval === 0) return { texto: "Todas las bitácoras entregadas ya están revisadas y avaladas.", tono: "bien" };
  return {
    texto: `${aprobadas} de ${entregadas} entregadas ya están avaladas; ${plural(sinAval, "espera", "esperan")} revisión o corrección.`,
    tono: sinAval / entregadas > 0.3 ? "regular" : "bien",
  };
}

export function lecturaRubrica(satisfactorio: number, valoradas: number): Lectura {
  if (!valoradas) return { texto: "Aún no hay Momentos 2 o 3 valorados.", tono: "neutro" };
  const diez = deCadaDiez(satisfactorio, valoradas);
  const p = pct(satisfactorio, valoradas);
  if (p >= 85) return { texto: `Buen desempeño en la empresa: ${diez} de cada 10 criterios quedan en «Satisfactorio».`, tono: "bien" };
  if (p >= 70)
    return { texto: `${diez} de cada 10 criterios en «Satisfactorio». Hay aspectos por mejorar que vale la pena acompañar.`, tono: "regular" };
  return {
    texto: `Solo ${diez} de cada 10 criterios en «Satisfactorio». Revisar con los instructores qué criterios fallan y si corresponde un plan de mejoramiento.`,
    tono: "atencion",
  };
}

export function lecturaJuicio(aprobados: number, noAprobados: number): Lectura {
  if (!aprobados && !noAprobados) return { texto: "Aún nadie llega al cierre (Momento 3).", tono: "neutro" };
  if (noAprobados)
    return {
      texto: `${plural(noAprobados, "aprendiz no aprobó", "aprendices no aprobaron")} el cierre. Revisar si corresponde un plan de mejoramiento.`,
      tono: "atencion",
    };
  return { texto: `${plural(aprobados, "aprendiz aprobó", "aprendices aprobaron")} el cierre de su etapa productiva.`, tono: "bien" };
}

export function lecturaNovedades(total: number, fueraDePlazo: number): Lectura {
  if (!total) return { texto: "No se ha registrado ninguna novedad.", tono: "neutro" };
  if (!fueraDePlazo) return { texto: "Todas se registraron dentro de los 3 días hábiles que pide la guía.", tono: "bien" };
  return { texto: `${plural(fueraDePlazo, "se registró", "se registraron")} después de los 3 días hábiles.`, tono: "regular" };
}

export function lecturaSinAnotar(sinAnotar: number, total: number): Lectura {
  if (!total) return { texto: "No hay novedades registradas que anotar.", tono: "neutro" };
  if (!sinAnotar) return { texto: "Todas las novedades ya quedaron anotadas en la bitácora.", tono: "bien" };
  return { texto: `${plural(sinAnotar, "novedad sigue", "novedades siguen")} sin aparecer en la bitácora del aprendiz.`, tono: "regular" };
}

export function lecturaPlanes(total: number, abiertos: number, noCumplidos: number): Lectura {
  if (!total) return { texto: "Ningún aprendiz ha necesitado plan de mejoramiento.", tono: "bien" };
  const partes = [
    abiertos ? `${plural(abiertos, "sigue abierto", "siguen abiertos")}` : null,
    noCumplidos ? `${plural(noCumplidos, "no se cumplió", "no se cumplieron")}` : null,
  ].filter(Boolean);
  return {
    texto: partes.length ? `De ${plural(total, "plan", "planes")}, ${partes.join(" y ")}.` : `Los ${total} planes ya se cerraron como cumplidos.`,
    tono: noCumplidos ? "atencion" : abiertos ? "regular" : "bien",
  };
}

export function lecturaConteoAlerta(n: number, siCero: string, siHay: string): Lectura {
  return n ? { texto: siHay, tono: "atencion" } : { texto: siCero, tono: "bien" };
}
