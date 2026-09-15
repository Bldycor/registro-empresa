@AGENTS.md

# CLAUDE.md — registro-empresa (SEPA)

**SEPA** = Seguimiento de Etapa Productiva Aprendices. Gestiona la **Etapa Productiva** (práctica de 6 meses) de aprendices SENA y está en producción en `ep.mkdirection.com`.

Fuentes de verdad funcional:
- `docs/REQUISITOS-FUNCIONALES.md` — requisitos validados, con las actualizaciones posteriores marcadas.
- La guía oficial **GFPI-G-040 v02** (*Guía para el Desarrollo de la Etapa Productiva*). Los comentarios del código citan sus secciones (§9.1.1, §9.3.1…).
- `docs/PLAN-IMPLEMENTACION.md` — roadmap y bitácora de lo construido.

## Stack técnico

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript.
- **Estilos:** Tailwind CSS 4.
- **Base de datos:** PostgreSQL (Neon) vía Prisma 7 (`@prisma/adapter-pg`, driver `pg`). Cliente generado en `src/generated/prisma` (no editar a mano).
- **Autenticación:** NextAuth v5 (beta), sesión JWT, login por **cédula** (no por correo). Configuración en `src/auth.ts`. El rol se revalida contra la base en cada request (`src/lib/auth-guards.ts`).
- **Formularios:** `react-hook-form` + `zod`. Validaciones compartidas en `src/lib/validations.ts`.
- **Integraciones externas:**
  - Google Calendar/Meet (`googleapis`), OAuth en `src/app/api/google/*`, lógica en `src/lib/google-calendar.ts` y `src/lib/video.ts`. Si Google falla, cae a **Jitsi Meet** y el correo se envía igual.
  - Correo con `nodemailer` (`src/lib/mailer.ts`) e invitaciones `.ics` con la librería `ics`.
  - Archivos adjuntos en **Vercel Blob** (`src/app/api/upload`, `src/components/file-upload-field.tsx`).
- **Lint:** ESLint (`npm run lint`). Hay un warning preexistente en `concertacion-form.tsx`; se tolera.

## Entorno — leer antes de probar cualquier cosa

- **`.env.local` apunta a la base de PRODUCCIÓN.** No hay base de desarrollo: todo lo que se haga desde localhost toca datos reales. Para probar, crear cuentas con cédulas `99000000xx` y contraseña `Scratch123!`, y borrarlas al terminar. **Nunca** cambiar la contraseña ni los datos de una cuenta real para probar.
- En local, `SMTP_*`, `EMAIL_FROM` y `GOOGLE_*` llegan enmascaradas como el texto literal `[SENSITIVE]`. El correo, Google Calendar y la subida a Vercel Blob **solo se pueden probar en producción**.
- `prisma.config.ts` solo carga `.env`, que apunta a una base local que ya no existe. Antes de cualquier comando de Prisma:
  `export DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | sed 's/^DATABASE_URL=//' | tr -d '"')`
- Las migraciones se escriben a mano, **solo aditivas**, y se aplican con `npx prisma migrate deploy` (seguido de `npx prisma generate`). Reiniciar el servidor de desarrollo después de regenerar el cliente.
- Despliegue: rama `fase2-gestion-evidencia-ep`. `git push origin fase2-gestion-evidencia-ep` y luego `npx vercel deploy --prod --yes --scope bldycors-projects`.
- Nunca commitear secretos (`.env*`).

## Comandos

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run lint     # lint
npx tsc --noEmit # verificación de tipos
```

## Estructura relevante

```
src/
  app/
    api/                          # route handlers, agrupados por rol
      etapa-productiva/           #   aprendiz: sus evidencias y novedades
      instructor/                 #   instructor: revisión de evidencias, seguimiento
      coordinador/                #   Coordinador y Admin: fichas, usuarios, avales, novedades
      admin/                      #   solo Admin: coordinadores
    formulario/
      (panel)/etapa-productiva/   # panel del aprendiz (nav horizontal: EvidenciaEPNav)
      instructor/ coordinador/ admin/   # paneles con sidebar (PanelSidebar)
  components/                     # formularios y paneles
  lib/
    seguimiento-evidencias.ts     # semáforo de las 6 evidencias — ÚNICO cálculo de plazos
    bitacora-fechas.ts            # fechas límite de bitácoras
    etapa-productiva-fechas.ts    # fechas de EP, tiempo restante tras interrumpir
    plazos-institucionales.ts     # plazos que la guía le fija a la institución
    requisitos-aval.ts            # requisitos para avalar una alternativa
    desercion.ts                  # señal de riesgo de deserción
    validations.ts                # esquemas Zod, enums y etiquetas
prisma/schema.prisma              # única fuente de verdad del modelo de datos
docs/                             # requisitos y plan
```

`calcularSeguimiento` alimenta a la vez el panel de Seguimiento del instructor, la insignia roja del nav del aprendiz y la validación de "Por certificar". Cualquier regla de plazos se cambia ahí, una sola vez.

## Modelo de datos (resumen — la fuente es `prisma/schema.prisma`)

- **`User`** — todos los roles (`Role`: `APRENDIZ`, `INSTRUCTOR`, `COORDINADOR`, `ADMIN`). En el aprendiz: ficha, estado, fechas de EP propias (`fechaInicio/FinEtapaProductiva`, se sincronizan al avalar la alternativa), `totalBitacoras` (6 o 12), `diasEjecutadosPrevios` y `bitacoraInicioTramo` (retoma tras interrumpir), requisitos de aval y constancia de deserción.
- **`Ficha`** — como máximo un instructor. De ahí sale quién evalúa a cada aprendiz.
- **`CompanyProfile`** — empresa y coformador. El coformador **no tiene cuenta**: su firma consta en los documentos adjuntos.
- **Las seis evidencias**, todas con `EstadoEvidencia` (`PENDIENTE` / `APROBADA` / `RECHAZADA`) y `avaladoPor` + `fechaAval`:
  `SeleccionAlternativaEP` (GFPI-F-165, la avala Coordinación) · `FormalizacionEtapaProductiva` · `ConcertacionFuncion` (Momento 1, con valoración `ConcertacionVariable`) · `Bitacora` (+ `BitacoraActividad`, GFPI-F-147) · `Evaluacion` (Momentos 2 y 3, rúbrica `EvaluacionVariable`, GFPI-F-023) · `CertificacionEmpresario`.
- **Novedades:** `InterrupcionEtapaProductiva` (se cambia de alternativa) y `AplazamientoEtapaProductiva` (se vuelve con la misma).

## Reglas de negocio — son decisiones institucionales, no cambiarlas sin consultar

**Estados del aprendiz** (`EstadoAprendiz`):
- `ACTIVO` → `POR_CERTIFICAR` → `CERTIFICADO`. Lo marca Por certificar el instructor, solo con las seis evidencias completas, y eso envía el correo con los requisitos. El paso a Certificado es **manual** (Coordinación), porque la certificación de estudio se expide fuera del sistema.
- Pausas: `PRACTICA_INTERRUMPIDA` y `APLAZADA`. Cierre por abandono: `DESERTADO`. En los tres el reloj de plazos está detenido: no se cuentan atrasos.

**Evidencias y evaluaciones:**
- Se evalúa con la **rúbrica de GFPI-F-023** (variables *Satisfactorio / Por mejorar* y juicio *Aprobado / No aprobado* en el Momento 3). La convención A/D/P de los requisitos originales **no se usa**; el enum `Calificacion` quedó sin uso.
- Una evidencia está completa **cuando está avalada**. Haberla hecho tarde no la deja "atrasada" para siempre.
- Plazos: Concertación, 15 días desde el inicio; Momento 2, al **50 % del plan**; Momento 3, 10 días antes del cierre; certificación del empresario, hasta el fin de la EP.
- **Bitácoras:** 6 o 12 por aprendiz. La cadencia reparte el período de práctica entre el total: 12 → cada 15 días, 6 → una por mes. **Con 6 aprobadas ya se cumple**, aunque se hayan planeado 12.
- El instructor consulta aprendices de cualquier ficha, pero solo evalúa los de las suyas.

**Novedades (guía GFPI-G-040):**
- **Interrupción** (§9.3.1): los días cumplidos se contabilizan y el tramo nuevo dura `180 − días previos`. La numeración de bitácoras continúa. Máximo 3 cambios de alternativa.
- **Aplazamiento** (§9.3): misma alternativa. Lo autoriza el **Comité de Evaluación y Seguimiento**, que no es un rol del sistema: Coordinación registra su decisión con el acta, que es obligatoria. No puede coexistir con una interrupción pendiente.
- **Deserción** (§9.1.1): el sistema solo señala el riesgo. La declara Coordinación, con causa obligatoria, en un endpoint propio y de forma reversible.
- **Requisitos de aval** (§9.1.1: RAPs, ARL, autorización de MinTrabajo): **advierten, no bloquean**. Avalar sin resolverlos exige dejar constancia escrita.
- **Plazos de la institución:** 8 días hábiles para el aval, 15 para el cambio de alternativa y 8 para registrar en SofiaPlus. SofiaPlus no está integrado: Coordinación anota la fecha como constancia. Los días hábiles no descuentan festivos.

## Roadmap

El detalle está en `docs/PLAN-IMPLEMENTACION.md`. Lo principal pendiente: correos por incumplimiento (al aprendiz y al coformador), vista consolidada por aprendiz, reportes con exportación a PDF y Excel, reunión extraordinaria a solicitud, plantillas descargables de GFPI-F-147 y GFPI-F-023, y aviso al reprogramar una reunión.

Trabajar un frente a la vez, y aplicar y probar cada migración antes de construir la interfaz encima.
