"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-md border border-white/40 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
    >
      Cerrar sesión
    </button>
  );
}
