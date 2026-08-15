// Sala de videollamada gratuita (Jitsi Meet, sin necesidad de cuenta ni credenciales).
// El nombre de sala se deriva del id de la concertación, así que el enlace es
// estable aunque el aprendiz reagende fecha/hora.
export function getVideoConferenceUrl(concertacionId: string): string {
  return `https://meet.jit.si/ConcertacionFunciones-${concertacionId}`;
}
