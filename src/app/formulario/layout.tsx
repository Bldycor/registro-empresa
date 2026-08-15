import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LogoutButton } from "@/components/logout-button";

export default async function FormularioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          Sesión iniciada como <strong>{session.user.email}</strong>
        </span>
        <LogoutButton />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
