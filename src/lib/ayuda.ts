// Guía de uso por rol (`/formulario/ayuda`). Explica qué hace cada rol en el SEPA y para qué sirve
// cada opción de su menú, con el mismo lenguaje que usa la interfaz. Es contenido, no lógica: si
// se agrega una opción al menú (`panel-sidebar.tsx` / `evidencia-ep-nav.tsx`), se describe acá.

export type OpcionAyuda = { opcion: string; que: string };
export type SeccionAyuda = { titulo: string; opciones: OpcionAyuda[] };
export type GuiaRol = {
  rol: string;
  resumen: string;
  secciones: SeccionAyuda[];
  consejos: string[];
};

const APRENDIZ: GuiaRol = {
  rol: "Aprendiz",
  resumen:
    "Tú diligencias y entregas las seis evidencias de tu etapa productiva, agendas tus reuniones de seguimiento y reportas las novedades. Tu instructor revisa y avala lo que entregas; Coordinación autoriza tu alternativa. La etapa productiva dura seis meses.",
  secciones: [
    {
      titulo: "Tus evidencias",
      opciones: [
        {
          opcion: "Alternativa EP",
          que: "Declaras con qué alternativa harás tu práctica (formato GFPI-F-165) y adjuntas el documento firmado. Cuando Coordinación la avala quedan fijadas tus fechas de inicio y fin. Aquí mismo pides el aplazamiento si tienes una novedad que te obliga a pausar, o reportas la interrupción si no puedes continuar con esa alternativa.",
        },
        {
          opcion: "Formalización",
          que: "Subes el documento que formaliza tu vínculo con la empresa: contrato de aprendizaje, carta de vínculo laboral, carta de pasantía u otro.",
        },
        {
          opcion: "Bitácoras",
          que: "Registras las actividades que realizas (formato GFPI-F-147). Son 6 —una por mes— o 12 —una cada 15 días—, durante los seis meses. La evidencia se cumple con 6 bitácoras aprobadas. Puedes descargar la plantilla oficial desde esa misma pantalla.",
        },
        {
          opcion: "Evaluaciones",
          que: "Agendas los tres Momentos con tu instructor: concertación (Momento 1), seguimiento (Momento 2) y cierre (Momento 3). Si surge un problema, desde aquí pides una reunión extraordinaria, a nombre tuyo o de tu coformador.",
        },
        {
          opcion: "Certificación",
          que: "Subes la carta de terminación a satisfacción que expide la empresa al terminar tu práctica.",
        },
      ],
    },
    {
      titulo: "Seguimiento y consulta",
      opciones: [
        {
          opcion: "Novedades",
          que: "Reportas cualquier hecho que afecte tu práctica sin detenerla: cambio de coformador o de funciones, accidente de trabajo, incapacidad corta, problemas con la ARL. Tienes 3 días hábiles para registrarlo y 5 para dejarlo anotado en tu bitácora.",
        },
        {
          opcion: "Expediente",
          que: "Todo tu proceso en una sola página: datos, evidencias con su revisión, reuniones, novedades y avisos. Se guarda en PDF desde el botón «Imprimir o guardar en PDF».",
        },
        {
          opcion: "Mi perfil",
          que: "Actualizas tus datos personales y los de la empresa donde haces la práctica, incluido el contacto de tu coformador.",
        },
      ],
    },
  ],
  consejos: [
    "La insignia roja sobre una pestaña indica evidencias rechazadas o atrasadas: entra y revisa qué falta.",
    "Recibes correos cuando una entrega está por vencer o ya venció, y el día antes de cada reunión.",
    "Si tu instructor devuelve una evidencia, la observación te dice qué corregir; vuelve a enviarla desde la misma pantalla.",
  ],
};

const INSTRUCTOR: GuiaRol = {
  rol: "Instructor de seguimiento",
  resumen:
    "Acompañas a los aprendices de las fichas que te asignaron: revisas y avalas sus evidencias, valoras los tres Momentos con la rúbrica del formato GFPI-F-023 y llevas el seguimiento hasta dejarlos en «Por certificar». Puedes consultar a cualquier aprendiz, pero solo evalúas a los de tus fichas.",
  secciones: [
    {
      titulo: "Seguimiento",
      opciones: [
        {
          opcion: "Seguimiento",
          que: "El semáforo de las seis evidencias de cada aprendiz: qué está completo, atrasado, próximo a vencer o pendiente. Cuando las seis quedan avaladas aparece la casilla para marcarlo «Por certificar», que le envía el correo con los requisitos.",
        },
        {
          opcion: "Aprendices",
          que: "La lista de aprendices. Los de tus fichas quedan marcados como evaluables: ahí corriges su fecha de inicio y fin de etapa productiva y cuántas bitácoras le corresponden, uno a uno o para toda la ficha.",
        },
      ],
    },
    {
      titulo: "Evidencias por revisar",
      opciones: [
        {
          opcion: "Alternativas EP",
          que: "Consultas la alternativa que declaró cada aprendiz y su documento. El aval de esta evidencia lo hace Coordinación.",
        },
        { opcion: "Formalizaciones", que: "Apruebas o devuelves el documento que formaliza el vínculo con la empresa." },
        {
          opcion: "Bitácoras",
          que: "Revisas cada bitácora y la apruebas o la devuelves con observaciones para que el aprendiz la corrija.",
        },
        {
          opcion: "Evaluaciones",
          que: "Registras la rúbrica de los tres Momentos —13 variables en los Momentos 2 y 3, más el juicio final en el 3— y la retroalimentación. Desde aquí también reprogramas una reunión: a todos les llega el aviso con el horario anterior y el nuevo.",
        },
        { opcion: "Certificación", que: "Avalas la carta de terminación que expide la empresa." },
      ],
    },
    {
      titulo: "Reuniones y novedades",
      opciones: [
        {
          opcion: "Reuniones extraordinarias",
          que: "Apruebas o rechazas las reuniones adicionales que piden tus aprendices o sus coformadores. Al aprobarlas sale la citación con el enlace para todos; al rechazarlas, tu nota le llega al aprendiz.",
        },
        {
          opcion: "Novedades",
          que: "Las novedades de tus aprendices con su plazo: si se registraron dentro de los 3 días hábiles y si quedaron anotadas en la bitácora dentro de los 5. Puedes registrar una que te reporten por fuera y dejar tu comentario.",
        },
      ],
    },
    {
      titulo: "Consultas",
      opciones: [
        {
          opcion: "Reportes",
          que: "Métricas, cumplimiento por evidencia con la lista de aprendices en riesgo, y el listado por aprendiz. Filtras por ficha, instructor, empresa, estado y fechas, y descargas en Excel o en PDF.",
        },
        { opcion: "Mi perfil", que: "Actualizas tus datos de contacto." },
      ],
    },
  ],
  consejos: [
    "Los plazos que ves en ámbar son advertencias de la guía GFPI-G-040: nada se bloquea, pero quedan registrados.",
    "Una evidencia se da por completa cuando está avalada; haberla entregado tarde no la deja atrasada para siempre.",
    "Recibes copia de los avisos de plazo de tus aprendices y el recordatorio antes de cada reunión.",
  ],
};

const COORDINADOR: GuiaRol = {
  rol: "Coordinador de Etapa Productiva",
  resumen:
    "Administras la estructura del proceso —fichas, instructores y catálogo de competencias—, autorizas las alternativas de etapa productiva y resuelves las novedades que detienen la práctica. El paso final a «Certificado» también es tuyo, porque la certificación se expide fuera del sistema.",
  secciones: [
    {
      titulo: "Estructura",
      opciones: [
        {
          opcion: "Fichas",
          que: "Precargas las fichas antes de que los aprendices se registren, asignas el instructor de cada una y registras sus datos: estado, nivel, jornada, fechas y el reglamento del aprendiz (Acuerdo 007 de 2012 o 009 de 2024), que define si aplica el plazo de 24 meses.",
        },
        {
          opcion: "Instructores",
          que: "Creas instructores —uno a uno o importando una hoja de cálculo— y ves la carga de cada uno: cuántos aprendices activos tiene y si pasa del tope de 80 que fija la guía.",
        },
        {
          opcion: "Competencias",
          que: "El catálogo de competencias y resultados de aprendizaje por programa, que el instructor usa al concertar el plan de trabajo del Momento 1.",
        },
      ],
    },
    {
      titulo: "Aprendices",
      opciones: [
        {
          opcion: "Aprendices",
          que: "Creas, editas o importas aprendices y les asignas ficha. Aquí registras los requisitos de aval (resultados de la etapa lectiva, autorización de MinTrabajo) y declaras la deserción cuando corresponde, con su causa.",
        },
        {
          opcion: "Alternativas EP",
          que: "Avalas o devuelves la selección o modificación de alternativa (GFPI-F-165). Si falta algún requisito, puedes avalar igual dejando constancia escrita. Después anotas la fecha en que la registraste en SofiaPlus.",
        },
      ],
    },
    {
      titulo: "Novedades",
      opciones: [
        {
          opcion: "Interrupciones EP",
          que: "Avalas la interrupción de la práctica y confirmas los días ya cumplidos, que se descuentan del tramo siguiente. Son máximo tres cambios de alternativa.",
        },
        {
          opcion: "Aplazamientos EP",
          que: "Registras la decisión del Comité de Evaluación y Seguimiento sobre un aplazamiento, con el número y la fecha del acta, que son obligatorios.",
        },
      ],
    },
    {
      titulo: "Consultas",
      opciones: [
        {
          opcion: "Reportes",
          que: "Métricas, cumplimiento por evidencia con la lista de aprendices en riesgo, y el listado por aprendiz. Filtras y descargas en Excel o en PDF.",
        },
        { opcion: "Mi perfil", que: "Actualizas tus datos de contacto." },
      ],
    },
  ],
  consejos: [
    "Tienes 8 días hábiles para avalar una alternativa, 15 para un cambio y 8 para registrarla en SofiaPlus: cada pendiente muestra su antigüedad.",
    "El sistema solo señala el riesgo de deserción; declararla es una decisión tuya y queda con su causa.",
    "El paso de «Por certificar» a «Certificado» lo haces tú, cuando la certificación se expide fuera del sistema.",
  ],
};

// El administrador ve lo mismo que Coordinación, más la gestión de cuentas de coordinación.
const OPCION_COORDINADORES: OpcionAyuda = {
  opcion: "Coordinadores",
  que: "Creas y administras las cuentas de coordinación. Es la única opción exclusiva del administrador; el resto del menú es igual al de Coordinación.",
};

export function guiaDelRol(role: string): GuiaRol {
  if (role === "APRENDIZ") return APRENDIZ;
  if (role === "INSTRUCTOR") return INSTRUCTOR;
  if (role === "ADMIN") {
    return {
      ...COORDINADOR,
      rol: "Administrador",
      resumen: `${COORDINADOR.resumen} Además administras las cuentas de coordinación.`,
      secciones: COORDINADOR.secciones.map((s) =>
        s.titulo === "Estructura" ? { ...s, opciones: [OPCION_COORDINADORES, ...s.opciones] } : s,
      ),
    };
  }
  return COORDINADOR;
}

// Ayuda corta de cada opción de menú, para el ícono y la descripción que se ven al navegar
// (menú lateral del instructor/Coordinación y pestañas del aprendiz). La guía larga es la de
// arriba; esto es el recordatorio de una línea.
export const ayudaMenu: Record<string, { icono: string; resumen: string }> = {
  // Aprendiz
  "/formulario/etapa-productiva/alternativa": {
    icono: "📋",
    resumen: "Declara tu alternativa (GFPI-F-165) y pide aplazamiento o interrupción.",
  },
  "/formulario/etapa-productiva/formalizacion": {
    icono: "📄",
    resumen: "Sube el documento que formaliza tu vínculo con la empresa.",
  },
  "/formulario/etapa-productiva/bitacoras": {
    icono: "📓",
    resumen: "Registra tus actividades: 6 bitácoras (una por mes) o 12 (una cada 15 días).",
  },
  "/formulario/etapa-productiva/evaluaciones": {
    icono: "✅",
    resumen: "Agenda los tres Momentos y las reuniones extraordinarias.",
  },
  "/formulario/etapa-productiva/certificacion": {
    icono: "🏁",
    resumen: "Sube la carta de terminación que expide la empresa.",
  },
  "/formulario/etapa-productiva/novedades": {
    icono: "📌",
    resumen: "Reporta lo que afecte tu práctica: 3 días hábiles para registrarlo.",
  },
  "/formulario/etapa-productiva/expediente": {
    icono: "🗂️",
    resumen: "Todo tu proceso en una página, lista para guardar en PDF.",
  },
  // Instructor
  "/formulario/instructor/seguimiento": {
    icono: "🚦",
    resumen: "El semáforo de las seis evidencias de cada aprendiz.",
  },
  "/formulario/instructor/aprendices": {
    icono: "🎓",
    resumen: "Tus aprendices y sus fechas de etapa productiva.",
  },
  "/formulario/instructor/alternativas": {
    icono: "📋",
    resumen: "Consulta la alternativa declarada por cada aprendiz.",
  },
  "/formulario/instructor/formalizaciones": {
    icono: "📄",
    resumen: "Aprueba o devuelve el documento de formalización.",
  },
  "/formulario/instructor/bitacoras": { icono: "📓", resumen: "Revisa y avala las bitácoras." },
  "/formulario/instructor/evaluaciones": {
    icono: "✅",
    resumen: "Registra la rúbrica de los Momentos y reprograma reuniones.",
  },
  "/formulario/instructor/certificacion": {
    icono: "🏁",
    resumen: "Avala la carta del empresario.",
  },
  "/formulario/instructor/extraordinarias": {
    icono: "📅",
    resumen: "Aprueba o rechaza las reuniones adicionales.",
  },
  "/formulario/instructor/novedades": {
    icono: "📌",
    resumen: "Novedades de tus aprendices y sus plazos.",
  },
  "/formulario/instructor/perfil": { icono: "👤", resumen: "Tus datos de contacto." },
  // Coordinación y Admin
  "/formulario/admin/coordinadores": {
    icono: "🛡️",
    resumen: "Cuentas de coordinación (solo administrador).",
  },
  "/formulario/coordinador/fichas": {
    icono: "🗃️",
    resumen: "Precarga fichas, asigna instructor y fija fechas y reglamento.",
  },
  "/formulario/coordinador/instructores": {
    icono: "👥",
    resumen: "Crea instructores y revisa su carga frente al tope de 80.",
  },
  "/formulario/coordinador/competencias": {
    icono: "🧩",
    resumen: "Catálogo de competencias por programa.",
  },
  "/formulario/coordinador/aprendices": {
    icono: "🎓",
    resumen: "Crea, edita e importa aprendices; declara deserción.",
  },
  "/formulario/coordinador/alternativas": {
    icono: "📋",
    resumen: "Avala la alternativa y anota el registro en SofiaPlus.",
  },
  "/formulario/coordinador/interrupciones": {
    icono: "⏸️",
    resumen: "Avala interrupciones y confirma los días cumplidos.",
  },
  "/formulario/coordinador/aplazamientos": {
    icono: "⏳",
    resumen: "Registra la decisión del Comité, con su acta.",
  },
  "/formulario/coordinador/perfil": { icono: "👤", resumen: "Tus datos de contacto." },
  // Comunes
  "/formulario/reportes": {
    icono: "📊",
    resumen: "Métricas, cumplimiento y listado, con Excel y PDF.",
  },
  "/formulario/ayuda": { icono: "❓", resumen: "Qué hace tu rol y para qué sirve cada opción." },
  "/formulario/actualizar": { icono: "👤", resumen: "Tus datos personales y los de la empresa." },
};

// Frase de bienvenida por rol: qué va a hacer aquí quien entra.
export const bienvenidaRol: Record<string, string> = {
  APRENDIZ: "Aquí entregas tus evidencias, agendas tus reuniones y sigues tu etapa productiva al día.",
  INSTRUCTOR: "Aquí revisas las evidencias de tus aprendices, valoras los Momentos y llevas su seguimiento.",
  COORDINADOR: "Aquí administras fichas e instructores, autorizas alternativas y resuelves novedades.",
  ADMIN: "Aquí administras todo el proceso: cuentas, fichas, alternativas, novedades y reportes.",
};
