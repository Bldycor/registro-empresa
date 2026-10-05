import { prismaBase } from "@/lib/prisma-base";
import { auditarEscritura, debeAuditar } from "@/lib/auditoria";

// Cliente de la aplicación: el mismo de siempre, más la trazabilidad automática. Toda creación,
// cambio o borrado queda en `RegistroAuditoria` (quién, cuándo, desde dónde y qué datos), sin que
// cada ruta tenga que acordarse de hacerlo. Ver src/lib/auditoria.ts.
export const prisma = prismaBase.$extends({
  name: "auditoria",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const resultado = await query(args);
        if (debeAuditar(model, operation)) {
          await auditarEscritura(model, operation, args as Record<string, unknown>, resultado);
        }
        return resultado;
      },
    },
  },
});
