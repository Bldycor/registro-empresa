import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/auth-guards";

// El aprendiz retira una solicitud de reunión extraordinaria que el instructor todavía no ha
// respondido: por ejemplo, porque el problema se resolvió o para proponer otra fecha. Como aún no
// había salido ninguna citación, no hay nadie más a quien avisar.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, response } = await requireApiUser(["APRENDIZ"]);
  if (!user) return response;

  const { id } = await params;
  const existing = await prisma.evaluacion.findUnique({
    where: { id },
    select: { userId: true, esExtraordinario: true, estado: true },
  });
  if (!existing || existing.userId !== user.id || !existing.esExtraordinario) {
    return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  }
  if (existing.estado !== "PENDIENTE") {
    return NextResponse.json(
      { error: "Solo se puede retirar una solicitud que tu instructor todavía no ha respondido." },
      { status: 409 },
    );
  }

  await prisma.evaluacion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
