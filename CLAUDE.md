@AGENTS.md

# CLAUDE.md — registro-empresa

Sistema de gestión de la **Etapa Productiva** (práctica empresarial de 6 meses) de aprendices SENA. Ver `docs/REQUISITOS-FUNCIONALES.md` para el alcance funcional completo y validado, y `docs/PLAN-IMPLEMENTACION.md` para el roadmap de desarrollo por fases.

## Stack técnico

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript.
- **Estilos:** Tailwind CSS 4.
- **Base de datos:** PostgreSQL vía Prisma 7 (`@prisma/adapter-pg`, driver `pg`). Cliente generado en `src/generated/prisma` (no editar a mano).
- **Autenticación:** NextAuth v5 (beta) + `@auth/prisma-adapter`, contraseñas con `bcryptjs`. Configuración en `src/auth.ts`.
- **Formularios:** `react-hook-form` + `zod` (`@hookform/resolvers`).
- **Integraciones externas:**
  - Google Calendar/Meet vía `googleapis`, flujo OAuth en `src/app/api/google/auth` y `src/app/api/google/callback`, lógica en `src/lib/google-calendar.ts` y `src/lib/video.ts`. Si no hay integración de Google configurada, la app usa **Jitsi Meet como respaldo** (ver `.env.example`).
  - Notificaciones por correo vía `nodemailer` (`src/lib/mailer.ts`); en desarrollo sin SMTP configurado usa una cuenta Ethereal de prueba.
  - Generación de invitaciones `.ics` con la librería `ics`.
- **Lint:** ESLint (`npm run lint`).

## Comandos

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run lint     # lint
npx prisma migrate dev   # aplicar cambios de schema en desarrollo
npx prisma generate      # regenerar cliente (se corre solo en postinstall)
```

## Estructura relevante

```
src/
  app/
    api/                 # route handlers (etapa-productiva, google, auth, register, profile, account)
    formulario/(panel)/  # panel autenticado del aprendiz
    login/, register/    # auth pages
  components/            # formularios y widgets (concertacion-form, time-slot-picker, etc.)
  lib/                    # integraciones (google-calendar, mailer, video, prisma, time, validations)
  generated/prisma/       # cliente Prisma generado — no tocar directamente
prisma/schema.prisma      # única fuente de verdad del modelo de datos
docs/                     # requisitos y plan de implementación (fuente de verdad funcional)
```

## Modelo de datos actual (`prisma/schema.prisma`)

- **`User`** — hoy representa al **aprendiz**: datos personales (`nombres`, `apellidos`, `cedula`, `celular`, `direccionResidencia`, `codigoFicha`), auth (`email`, `passwordHash`). **No tiene todavía** campo de rol (aprendiz/instructor/coordinador) ni estado (Activo/Certificado) ni instructor asignado — ver plan de implementación.
- **`CompanyProfile`** — datos de la empresa 1:1 con `User`, incluye los datos de contacto del **coformador** (`nombreCoformador`, `cargoCoformador`, `correoCoformador`, `celularCoformador`). El coformador **no tiene cuenta en el sistema** (confirmado): es solo un dato de contacto.
- **`ConcertacionFuncion`** — la primera evaluación/reunión oficial (Evaluación 1 = Concertación), 1:1 con `User`. Combina en un solo modelo la reunión (fecha, hora, `videollamadaUrl`, `googleEventId`) y la evidencia. Este es el patrón de referencia para modelar Bitácora y Evaluaciones 2/3.

## Convenciones de negocio a respetar en el código

- Los aprendices tienen **dos estados**: `Activo` (en Etapa Productiva) y `Certificado` (ya graduado). El paso a `Certificado` es **manual** (lo actualiza el aprendiz o el instructor), porque la certificación de estudio se expide en otra instancia institucional externa al sistema.
- Las evaluaciones (incluida la Concertación como Evaluación 1) usan la convención de calificación **A / D / P**:
  - `A` = correcta/aprobada.
  - `D` = con errores, requiere corrección y reenvío.
  - `P` = pendiente por demora en la entrega.
- La Etapa Productiva se **aprueba** cuando **todas** las evidencias del aprendiz quedan en `A`. Esa condición dispara la notificación al aprendiz para iniciar su certificación de estudio.
- Los formatos institucionales oficiales son `GFPI-F-023_V06` (evaluaciones) y `GFPI-F-147 Vr 5` (bitácoras); deben poder descargarse como plantilla **o** diligenciarse con firma cargada directamente en la app.
- El **Instructor** puede consultar (solo lectura) aprendices de cualquier ficha, pero solo puede **evaluar / dar seguimiento de evaluación** a los aprendices asignados a su propia ficha.
- Ante incumplimiento de plazo (bitácora o evaluación), el sistema debe alertar y notificar por correo tanto al aprendiz como al coformador, y mantener registro histórico por aprendiz.

## Roadmap

El detalle fase por fase (qué falta del schema, qué endpoints, qué UI) está en `docs/PLAN-IMPLEMENTACION.md`. Trabajar una fase a la vez; no adelantar fases posteriores sin cerrar la anterior (migraciones de Prisma en particular deben aplicarse y probarse antes de construir UI sobre ellas).
