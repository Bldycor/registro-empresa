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
          que: "Registras las actividades que realizas (formato GFPI-F-147). Son seis bitácoras, una por cada mes de los seis de práctica. Puedes descargar la plantilla oficial desde esa misma pantalla, y al adjuntar tu bitácora firmada en PDF el sistema toma de ella las actividades realizadas y te las deja diligenciadas.",
        },
        {
          opcion: "Evaluaciones",
          que: "Agendas los tres Momentos con tu instructor: concertación (Momento 1), seguimiento (Momento 2) y cierre (Momento 3). En cada uno diligencias el formato GFPI-F-023 —llega con tus datos, los de tu ficha, tu instructor y tu empresa ya puestos; tú completas lo que falta—, lo revisas en la vista previa y lo envías junto con el formato firmado en PDF. En el Momento 1 propones el plan de trabajo (competencias y resultados, que eliges de la lista de tu programa; actividades y evidencias) y tu instructor lo ajusta contigo. Si surge un problema, desde aquí pides una reunión extraordinaria, a nombre tuyo o de tu coformador. Si en algún Momento quedan resultados de aprendizaje sin superar, en esta misma pantalla aparece tu plan de mejoramiento: qué debes presentar y hasta cuándo.",
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
          que: "Actualizas tus datos personales, eliges tu empresa por su NIT —el nombre y la dirección salen del registro oficial de SEPA— y registras el contacto de tu coformador. Si tu empresa todavía no está registrada, pídele al administrador que la registre.",
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
          que: "Registras la rúbrica de los tres Momentos —13 variables en los Momentos 2 y 3 (Factores Técnicos y Actitudinales), más el juicio final y el número de visitas en el 3— y la retroalimentación. Acá ves también el formato GFPI-F-023 que envió el aprendiz y, en el Momento 1, el plan de trabajo que propuso, para ajustarlo con él. Desde aquí también reprogramas una reunión: a todos les llega el aviso con el horario anterior y el nuevo.",
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
        {
          opcion: "Planes de mejoramiento",
          que: "Cuando un aprendiz no supera resultados de aprendizaje en alguno de los tres Momentos —y ya se le hicieron los dos llamados de atención—, aquí redactas el plan: qué quedó pendiente, qué actividades hará, qué evidencias presentará y en cuántos días calendario (máximo 20). Lo autoriza la coordinación académica, que es quien se lo comunica por escrito; tú verificas después si se cumplió. Un plan sin cerrar o no cumplido advierte, pero no impide certificar, y puedes abrir un segundo plan si el caso lo amerita.",
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
    "Los números en naranja del menú son lo que espera tu revisión en cada bandeja; un Momento cuenta cuando la reunión ya pasó y falta valorarlo.",
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
          opcion: "Datos del centro",
          que: "La regional, el centro de formación y la estrategia formativa que el formato GFPI-F-023 pide en su encabezado. Se escriben una sola vez y entran solos en los tres momentos de todos los aprendices, para que ninguno los teclee mal. Lo que dejes vacío sale en blanco en el formato.",
        },
        {
          opcion: "Competencias",
          que: "El catálogo de competencias y resultados de aprendizaje por programa, que el instructor usa al concertar el plan de trabajo del Momento 1. Es la única fuente: aprendices e instructores solo eligen de esta lista, nadie escribe competencias a mano, así que cada programa necesita su catálogo cargado. No admite duplicados: un resultado o una competencia que ya está en el programa, aunque venga con otra numeración, se rechaza al cargarlo.",
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
        {
          opcion: "Planes de mejoramiento",
          que: "Autorizas los planes que redactan los instructores. El reglamento del aprendiz (Acuerdo 009) pide la firma del coordinador académico: tu autorización es esa firma, y con ella arranca el plazo y le llega la comunicación escrita al aprendiz. No requiere acta del Comité. Si algo falta, lo devuelves al instructor con tu observación.",
        },
      ],
    },
    {
      titulo: "Consultas",
      opciones: [
        {
          opcion: "Reportes",
          que: "Empieza con un panorama fácil de explicar: una frase, un cuadro por aprendiz coloreado según cómo va, y cuatro tarjetas (cuántos acompañamos, cuántos van al día, quiénes necesitan atención y cuántos terminaron) con qué significa cada número y cómo leerlo. Después, las métricas explicadas, el cumplimiento por evidencia con la lista de quienes necesitan atención, los consolidados por ficha y programa y el listado por aprendiz. Filtras y descargas en Excel o en PDF.",
        },
        {
          opcion: "Gestión de instructores",
          que: "Cómo va el acompañamiento de cada instructor a los aprendices de sus fichas: cuántos van al día y cuántos necesitan atención, qué entregas esperan su revisión y cuáles llevan más de 8 días hábiles, cuánto tarda en responder y si ya valoró los momentos que se hicieron. Cada número dice qué mide y cómo leerlo; sirve para apoyar, no para sancionar.",
        },
        {
          opcion: "Funciones en la empresa",
          que: "Qué funciones hacen los aprendices en su práctica, por ficha y por programa —las asignadas en el plan del Momento 1 y las que reportan en sus bitácoras—: las más comunes, cuáles coinciden con las competencias técnicas del programa, qué competencias no aparecen en la práctica y qué funciones no contempla ninguna, con recomendaciones como insumo para mejorar el programa de formación.",
        },
        {
          opcion: "Trazabilidad",
          que: "Quién hizo qué, cuándo y desde qué conexión: cada creación, cambio o borrado, cada ingreso, los intentos fallidos y las cuentas bloqueadas. Filtras por persona, acción, tipo de registro y fechas. Las contraseñas nunca se guardan ahí, y nadie puede editar ni borrar el registro.",
        },
        { opcion: "Mi perfil", que: "Actualizas tus datos de contacto." },
      ],
    },
  ],
  consejos: [
    "Tienes 8 días hábiles para avalar una alternativa, 15 para un cambio y 8 para registrarla en SofiaPlus: cada pendiente muestra su antigüedad.",
    "El sistema solo señala el riesgo de deserción; declararla es una decisión tuya y queda con su causa.",
    "El paso de «Por certificar» a «Certificado» lo haces tú, cuando la certificación se expide fuera del sistema.",
    "Los números en naranja del menú son lo que espera tu acción en cada bandeja.",
  ],
};

// El administrador ve lo mismo que Coordinación, más la gestión de cuentas de coordinación.
const OPCION_COORDINADORES: OpcionAyuda = {
  opcion: "Coordinadores",
  que: "Creas y administras las cuentas de coordinación. Junto con «Contraseñas», son las opciones exclusivas del administrador; el resto del menú es igual al de Coordinación.",
};

const OPCION_CLAVES: OpcionAyuda = {
  opcion: "Contraseñas",
  que: "Cambias la contraseña de cualquier usuario de SEPA cuando no puede recuperarla por correo. Es exclusivo del administrador y siempre pide tu propia contraseña para confirmar; 5 intentos errados bloquean tu cuenta 15 minutos. Cambiarla también desbloquea la cuenta de la persona, y el cambio queda en Trazabilidad sin la contraseña.",
};

const OPCION_EMPRESAS: OpcionAyuda = {
  opcion: "Empresas",
  que: "El registro oficial de las empresas donde los aprendices hacen la práctica. Lo crean y lo corrigen el administrador y Coordinación; el aprendiz no puede registrar empresas. Cada empresa se identifica por su NIT —con el dígito de verificación comprobado—, toma la razón social del RUES de las Cámaras de Comercio, y su departamento y municipio se eligen de la lista oficial del DANE. Puedes registrarlas una por una o importarlas en bloque desde una hoja de cálculo, revisando antes fila por fila, y enlazar las que los aprendices habían escrito a mano. El aprendiz elige su empresa por el NIT; si no está registrada, no puede completar su perfil hasta que la registres. Varios aprendices pueden estar en la misma empresa, y una empresa puede tener varias sedes con el mismo NIT: en «Sedes» agregas sus sucursales (nombre, dirección y ubicación) y cada aprendiz elige la suya. Una sede con aprendices no se puede quitar.",
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
        s.titulo === "Estructura" ? { ...s, opciones: [OPCION_COORDINADORES, OPCION_CLAVES, OPCION_EMPRESAS, ...s.opciones] } : s,
      ),
    };
  }
  // Coordinación también administra el catálogo de empresas (9 oct 2026).
  return {
    ...COORDINADOR,
    secciones: COORDINADOR.secciones.map((s) =>
      s.titulo === "Estructura" ? { ...s, opciones: [OPCION_EMPRESAS, ...s.opciones] } : s,
    ),
  };
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
    resumen: "Registra tus actividades: seis bitácoras, una por mes.",
  },
  "/formulario/etapa-productiva/evaluaciones": {
    icono: "✅",
    resumen: "Agenda los Momentos, diligencia el GFPI-F-023 y adjunta el firmado.",
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
  "/formulario/instructor/planes": {
    icono: "📝",
    resumen: "Redacta y verifica los planes de mejoramiento de tus aprendices.",
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
  "/formulario/admin/claves": {
    icono: "🔑",
    resumen: "Cambia la contraseña de cualquier usuario, confirmando con la tuya.",
  },
  "/formulario/admin/empresas": {
    icono: "🏢",
    resumen: "Empresas por NIT, con el RUES, y sus sedes o sucursales.",
  },
  "/formulario/reportes/instructores": {
    icono: "🧑‍🏫",
    resumen: "Cómo acompaña cada instructor: al día, revisión a tiempo y momentos valorados.",
  },
  "/formulario/reportes/funciones": {
    icono: "🧭",
    resumen: "Qué hacen los aprendices en la empresa vs. las competencias del programa.",
  },
  "/formulario/coordinador/auditoria": {
    icono: "🛡️",
    resumen: "Quién hizo qué y cuándo: cambios, ingresos y bloqueos.",
  },
  "/formulario/coordinador/configuracion": {
    icono: "🏛️",
    resumen: "Regional, centro y estrategia: entran solos en el GFPI-F-023.",
  },
  "/formulario/coordinador/planes": {
    icono: "📝",
    resumen: "Autoriza el plan de mejoramiento: tu firma arranca el plazo.",
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
