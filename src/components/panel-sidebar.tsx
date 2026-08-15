"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/formulario/actualizar", label: "Actualización de datos" },
  { href: "/formulario/etapa-productiva", label: "Gestión de la etapa productiva" },
];

export function PanelSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex w-full shrink-0 gap-2 overflow-x-auto border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:min-h-full sm:w-64 sm:flex-col sm:overflow-visible sm:border-b-0 sm:border-r">
      {links.map((link) => {
        const active = pathname?.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
