import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
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
        const cedula = credentials?.cedula as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!cedula || !password) return null;

        const user = await prisma.user.findUnique({ where: { cedula } });
        if (!user) return null;

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) return null;

        return { id: user.id, email: user.email, name: `${user.nombres} ${user.apellidos}` };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }
      if (trigger === "update" && session?.email) {
        token.email = session.email;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
