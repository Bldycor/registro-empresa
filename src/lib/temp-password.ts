// Contraseña temporal para una cuenta creada por otro rol (el ADMIN crea Coordinadores, el
// Coordinador crea Instructores — ninguno de los dos se autoregistra ni elige su propia
// contraseña). Se usa la cédula como contraseña inicial: fácil de comunicar y de recordar en el
// primer ingreso. El correo de bienvenida ya recuerda cambiarla después de entrar.
export function generarPasswordTemporal(cedula: string): string {
  return cedula;
}
