import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prismaBase } from "@/lib/prisma-base";
import { ipActual, registrarAuditoria } from "@/lib/auditoria";

// Protección del ingreso (4 oct 2026): 5 contraseñas erradas seguidas bloquean la cuenta
// 15 minutos. Cada ingreso, intento fallido y bloqueo queda en el rastro de auditoría.
const INTENTOS_MAXIMOS = 5;
const BLOQUEO_MS = 15 * 60 * 1000;

// La sesión dura una jornada (12 horas) en vez de los 30 días por defecto: un equipo compartido o
// una sesión olvidada en una sala de cómputo no queda abierta indefinidamente.
const DURACION_SESION_S = 12 * 60 * 60;

// Le llega a la pantalla de ingreso como `code`, para decir que la cuenta está bloqueada en vez
// del mensaje genérico de datos incorrectos.
class CuentaBloqueada extends CredentialsSignin {
  code = "bloqueada";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: DURACION_SESION_S },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        // Dato de ingreso principal: la cédula (es constante, a diferencia del correo que puede
        // cambiar). El correo se sigue guardando como dato de contacto y como canal para la
        // recuperación de contraseña.
        cedula: { label: "Cédula", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const cedula = (credentials?.cedula as string | undefined)?.trim();
        const password = credentials?.password as string | undefined;

        if (!cedula || !password) return null;

        // Los contadores se escriben con el cliente base: el rastro lo dejan los eventos de
        // abajo, con la IP, y no una entrada por cada contador.
        const user = await prismaBase.user.findUnique({ where: { cedula } });
        const ip = await ipActual();
        const actor = (u: typeof user) => ({
          id: u?.id ?? null,
          nombre: u ? `${u.nombres} ${u.apellidos}` : null,
          rol: u?.role ?? null,
          ip,
        });

        if (!user) {
          await registrarAuditoria({
            accion: "INGRESO_FALLIDO",
            entidad: "Sesion",
            detalle: { motivo: "Cédula no registrada", cedula },
            actor: actor(null),
          });
          return null;
        }

        const ahora = new Date();
        if (user.bloqueadoHasta && user.bloqueadoHasta > ahora) {
          await registrarAuditoria({
            accion: "INGRESO_BLOQUEADO",
            entidad: "Sesion",
            entidadId: user.id,
            detalle: { bloqueadoHasta: user.bloqueadoHasta },
            actor: actor(user),
          });
          throw new CuentaBloqueada();
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
          const intentos = user.intentosFallidos + 1;
          const bloquear = intentos >= INTENTOS_MAXIMOS;
          await prismaBase.user.update({
            where: { id: user.id },
            data: bloquear
              ? { intentosFallidos: 0, bloqueadoHasta: new Date(ahora.getTime() + BLOQUEO_MS) }
              : { intentosFallidos: intentos },
          });
          await registrarAuditoria({
            accion: bloquear ? "CUENTA_BLOQUEADA" : "INGRESO_FALLIDO",
            entidad: "Sesion",
            entidadId: user.id,
            detalle: bloquear
              ? { motivo: `${INTENTOS_MAXIMOS} contraseñas erradas seguidas`, minutos: BLOQUEO_MS / 60000 }
              : { motivo: "Contraseña errada", intento: intentos },
            actor: actor(user),
          });
          if (bloquear) throw new CuentaBloqueada();
          return null;
        }

        await prismaBase.user.update({
          where: { id: user.id },
          data: { intentosFallidos: 0, bloqueadoHasta: null, ultimoIngreso: ahora },
        });
        await registrarAuditoria({ accion: "INGRESO", entidad: "Sesion", entidadId: user.id, actor: actor(user) });

        return { id: user.id, email: user.email, name: `${user.nombres} ${user.apellidos}`, rol: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        // Solo para el rastro de auditoría; los permisos se leen siempre de la base.
        token.rol = (user as { rol?: string }).rol;
      }
      if (trigger === "update" && session?.email) {
        token.email = session.email;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.rol = token.rol as string | undefined;
      }
      return session;
    },
  },
});
