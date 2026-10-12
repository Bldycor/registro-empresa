// Nombres de los momentos tal como se los lee el aprendiz en correos y avisos. Sin dependencias:
// lo usan tanto la redacción de correos (funciones puras) como el lector del GFPI-F-023.
export const NOMBRE_MOMENTO = {
  1: "Momento 1 (Concertación)",
  2: "Momento 2 (Seguimiento)",
  3: "Momento 3 (Cierre)",
} as const;

// Lo que se limpia cuando un momento devuelto por el instructor (9 oct 2026) se retoma: al
// agendarlo de nuevo o al reenviar su formato vuelve a quedar pendiente, sin el motivo.
export const REABRIR_DEVUELTO = {
  estado: "PENDIENTE",
  observaciones: null,
  avaladoPorId: null,
  fechaAval: null,
} as const;

// Lo que se limpia al devolverlo: el horario y la videollamada. Así el momento deja de contar
// como agendado en todo lo que lee el horario —recordatorios, franja del instructor, avisos de
// plazo— y, al agendarlo de nuevo, sale una citación nueva con su propio evento.
export const HORARIO_LIBERADO = {
  fecha: null,
  horaInicio: null,
  horaFin: null,
  videollamadaUrl: null,
  googleEventId: null,
} as const;
