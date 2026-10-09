import { cache } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

const NOMBRE_ROL: Record<Role, string> = {
  APRENDIZ: "aprendiz",
  INSTRUCTOR: "instructor",
  COORDINADOR: "Coordinación",
  ADMIN: "administrador",
};

// Usuario de la sesión actual, con su rol ya resuelto desde la base de datos. La sesión (JWT)
// solo guarda el id; el rol se consulta aquí para no duplicarlo en el token y evitar que quede
// desactualizado si un coordinador cambia el rol de alguien.
//
// `cache` (React) la resuelve una sola vez por petición: el layout, la página y sus componentes
// pueden pedirla sin repetir la consulta.
export const getSessionUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, nombres: true, apellidos: true, email: true },
  });

  return user;
});

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
    // Pasa sobre todo cuando en el mismo navegador se ingresa con otra cuenta: las pestañas que
    // quedaron abiertas pasan a la nueva sesión. El mensaje lo dice para que no parezca una falla.
    const quien = `${user.nombres} ${user.apellidos}`.trim();
    const para = allowedRoles.map((r) => NOMBRE_ROL[r]).join(" o ");
    return {
      user: null,
      response: NextResponse.json(
        {
          error: `La sesión abierta en este navegador es de ${quien} (${NOMBRE_ROL[user.role]}), y esta acción es de ${para}. Si ingresaste con otra cuenta en otra pestaña, cierra sesión y vuelve a ingresar con la cuenta correcta.`,
        },
        { status: 403 },
      ),
    };
  }
  return { user, response: null };
}
