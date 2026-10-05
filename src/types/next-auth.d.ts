import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      // Solo para el rastro de auditoría. Los permisos SIEMPRE se leen del usuario en la base
      // (src/lib/auth-guards.ts), nunca de aquí.
      rol?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    rol?: string;
  }
}
