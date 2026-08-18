import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

// Usuario de la sesión actual, con su rol ya resuelto desde la base de datos. La sesión (JWT)
// solo guarda el id; el rol se consulta aquí para no duplicarlo en el token y evitar que quede
// desactualizado si un coordinador cambia el rol de alguien.
export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, nombres: true, apellidos: true, email: true },
  });

  return user;
}

// Para Server Components / páginas: exige sesión y, opcionalmente, uno de los roles indicados.
// Si no cumple, redirige (a /login si no hay sesión, a /formulario si el rol no alcanza).
export async function requireUser(allowedRoles?: Role[]) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(user.role)) redirect("/formulario");
  return user;
}

// Para Route Handlers (API): igual que requireUser pero devuelve una respuesta 401/403 en vez
// de redirigir, ya que estas rutas las consume el cliente vía fetch.
export async function requireApiUser(allowedRoles?: Role[]) {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      user: null,
      response: NextResponse.json({ error: "No autorizado para esta acción." }, { status: 403 }),
    };
  }
  return { user, response: null };
}
