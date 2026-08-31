// Sala de videollamada gratuita (Jitsi Meet, sin necesidad de cuenta ni credenciales).
// El nombre de sala se deriva del id de la reunión (concertación o evaluación), así que el
// enlace es estable aunque el aprendiz reagende fecha/hora.
export function getVideoConferenceUrl(reunionId: string, prefijo: string = "ConcertacionFunciones"): string {
  return `https://meet.jit.si/${prefijo}-${reunionId}`;
}
