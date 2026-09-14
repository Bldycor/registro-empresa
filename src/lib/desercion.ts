// Riesgo de deserción de la Etapa Productiva — guía GFPI-G-040 §9.1.1 y §7.
//
// El sistema NUNCA declara la deserción solo. La deserción es un acto administrativo con
// consecuencias para el aprendiz (pierde el cupo, se reporta en SofiaPlus), así que lo que se
// calcula acá es únicamente la señal: "este aprendiz ya cumple la causal, revísalo". Quien la
// declara es Coordinación, explícitamente y dejando la causa registrada
// (ver `DesercionSchema` y el panel de Aprendices).
//
// Se calcula en memoria al leer, igual que el semáforo de evidencias
// (src/lib/seguimiento-evidencias.ts): sin trabajo programado, sin estado duplicado en la base y
// sin el riesgo de que un proceso automático cambie estados de aprendices mientras nadie mira.

export type RiesgoDesercion = {
  enRiesgo: boolean;
  // Qué causal de la guía se cumplió, redactada para mostrarse tal cual en el panel.
  causa: string | null;
};

const SIN_RIESGO: RiesgoDesercion = { enRiesgo: false, causa: null };

function formato(fecha: Date): string {
  return fecha.toLocaleDateString("es-CO", { timeZone: "UTC" });
}

export function evaluarRiesgoDesercion(input: {
  hoy: Date;
  estado: string;
  // Fecha fin de formación de la ficha: es la "fecha fin del grupo" a la que se refiere la guía
  // como plazo máximo tanto para presentar la planeación como para conseguir nueva alternativa.
  fechaFinFormacionFicha: Date | null;
  // Momento 1 (Planeación/Concertación) ya agendado — la evidencia de que arrancó el proceso.
  concertacionFecha: Date | null;
  // El aprendiz interrumpió su práctica y todavía no tiene alternativa nueva avalada.
  practicaInterrumpida: boolean;
}): RiesgoDesercion {
  // Los procesos ya cerrados no vuelven a entrar en riesgo.
  if (input.estado === "DESERTADO" || input.estado === "CERTIFICADO" || input.estado === "POR_CERTIFICAR") {
    return SIN_RIESGO;
  }
  // El aplazamiento es justamente lo contrario de la deserción: hay una novedad autorizada por el
  // Comité que explica la pausa, así que el plazo no corre en contra del aprendiz (§9.3).
  if (input.estado === "APLAZADA") return SIN_RIESGO;

  const limite = input.fechaFinFormacionFicha;
  if (!limite || input.hoy <= limite) return SIN_RIESGO;

  // Causal 1 (§9.1.1): pasó la fecha fin del grupo sin presentar la planeación.
  if (!input.concertacionFecha) {
    return {
      enRiesgo: true,
      causa: `No presentó la planeación de su Etapa Productiva y su ficha terminó el ${formato(limite)}.`,
    };
  }

  // Causal 2 (§7): interrumpió y no alcanzó a conseguir alternativa nueva avalada dentro del
  // período de ejecución.
  if (input.practicaInterrumpida) {
    return {
      enRiesgo: true,
      causa: `Interrumpió su práctica y no consiguió alternativa nueva avalada antes del ${formato(limite)}, fecha fin de su ficha.`,
    };
  }

  return SIN_RIESGO;
}
