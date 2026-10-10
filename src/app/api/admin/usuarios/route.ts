import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";

// Búsqueda de usuarios de todos los roles, para cambiarles la contraseña. Solo el administrador.
export async function GET(request: Request) {
  const { user, response } = await requireApiUser(["ADMIN"]);
  if (!user) return response;

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json({ usuarios: [] });

  const palabras = q.split(/\s+/).filter(Boolean).slice(0, 4);
  const usuarios = await prisma.user.findMany({
    where: {
      OR: [
        { cedula: { startsWith: q.replace(/\D/g, "") || "—" } },
        { email: { contains: q, mode: "insensitive" } },
        {
          AND: palabras.map((p) => ({
            OR: [
              { nombres: { contains: p, mode: "insensitive" as const } },
              { apellidos: { contains: p, mode: "insensitive" as const } },
            ],
          })),
        },
      ],
    },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      cedula: true,
      email: true,
      role: true,
      bloqueadoHasta: true,
      ultimoIngreso: true,
    },
    orderBy: [{ nombres: "asc" }, { apellidos: "asc" }],
    take: 20,
  });

  const ahora = new Date();
  return NextResponse.json({
    usuarios: usuarios.map((u) => ({
      ...u,
      bloqueado: Boolean(u.bloqueadoHasta && u.bloqueadoHasta > ahora),
    })),
  });
}
