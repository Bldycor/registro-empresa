# Plan de Implementación
## registro-empresa — de lo construido al alcance validado

**Fecha:** 17 de agosto de 2026
**Referencia funcional:** `docs/REQUISITOS-FUNCIONALES.md` (validado, sin puntos pendientes)

Este documento traduce el documento de requisitos ya validado en pasos de código concretos, comparando contra lo que ya existe en el repositorio. Está pensado para trabajarse con Claude Code **una fase a la vez**.

## Estado de avance

- **Fase 0 (modelo de datos): COMPLETA en la base local.** `prisma/schema.prisma` extendido de forma aditiva (sin romper `ConcertacionFuncion` = Evaluación 1, ya en uso): nuevos enums `Role`, `EstadoAprendiz`, `Calificacion`, `EstadoEvidencia`; nuevos campos en `User` (`role`, `estado`, `fechaInicioEtapaProductiva`, `instructorId`); nuevos modelos `Evaluacion` (evaluaciones 2 y 3), `Bitacora` y `CertificacionEmpresario`. Migración `20260816231953_fase0_roles_bitacoras_evaluaciones` aplicada a la base local y cliente de Prisma regenerado (v7.9.1). Backup del esquema anterior en `prisma/schema.prisma.bak-fase0`.
  - **Neon (producción): sincronizada.** Se limpiaron las tablas originales (creadas antes de usar el sistema de migraciones, sin historial) y se aplicó la migración completa vía `prisma migrate deploy`. Ambos entornos (local y Neon) están ahora en el mismo estado de esquema.
- **Correo de bienvenida al registrarse: COMPLETO.** `POST /api/register` ahora envía un correo (`sendWelcomeEmail` en `src/lib/mailer.ts`) confirmando la creación de la cuenta, con el usuario (correo) y la contraseña elegida, y el enlace de login. El envío no bloquea el registro: si falla (SMTP caído, etc.) la cuenta queda creada igual y solo se registra el error en el log del servidor. Verificado en vivo (registro de prueba + confirmación de entrega del correo).
- **Fase 1 (roles y asignación instructor↔aprendiz): COMPLETA en la base local y en Neon (producción).** Diseño final (corregido durante la implementación): una ficha tiene **como máximo un instructor asignado** (relación 1-a-muchos: un instructor puede tener varias fichas, pero cada ficha solo un instructor). Se agregó el modelo `Ficha` (`codigo` único, `programa` opcional, `instructorId` opcional) y `User.fichaId` reemplazando el antiguo campo de texto libre `codigoFicha` y la antigua relación directa `User.instructorId` (de Fase 0, nunca usada desde ninguna UI). Migración `20260817051707_fase1_fichas_instructor_asignado` escrita a mano (el motor de esquema de Prisma no tiene acceso de red en este entorno) con *backfill* de datos: las 7 fichas existentes (antes texto libre) se convirtieron en filas reales de `Ficha` y los aprendices existentes quedaron enlazados por `fichaId`, sin pérdida de datos. Aplicada a Neon (la misma base que sirve `ep.mkdirection.com`) vía `prisma migrate deploy`.
  - **Coordinador:** administra la precarga de fichas (`/formulario/coordinador/fichas`) — carga masiva pegando una lista de códigos (uno por línea o separados por coma, duplicados ignorados) y asigna/reasigna el instructor autorizado de cada ficha desde un desplegable. Ve todo en modo consulta.
  - **Instructor:** puede consultar (solo lectura) a **cualquier** aprendiz de **cualquier** ficha desde `/formulario/instructor/aprendices`, pero la vista marca explícitamente cuáles puede evaluar ("Evaluable") — los de las fichas donde él es el instructor asignado — y cuáles son solo consulta.
  - **Registro de aprendiz:** el campo de ficha pasó de texto libre a una lista desplegable (`GET /api/fichas`, público) poblada con las fichas precargadas por el coordinador; si el aprendiz no encuentra su ficha, no puede registrarse con un código inventado (evita fichas "fantasma").
  - **Autorización:** helpers centralizados `requireUser`/`requireApiUser`/`getSessionUser` (`src/lib/auth-guards.ts`) — el rol se valida siempre contra la base de datos en cada request, no se confía en el JWT de sesión.
  - Verificado en vivo de punta a punta: registro de aprendiz de prueba seleccionando ficha del desplegable → login como coordinador (carga masiva + asignación de instructor) → login como instructor (se confirma que el aprendiz recién registrado aparece con "Evaluable" en la ficha asignada, y "Solo consulta" en las demás).
  - Pendiente de este cierre de fase: `npm run lint` y una pasada limpia de `npx tsc --noEmit` / `npm run build` (no se pudieron correr en este entorno por límite de tiempo del sandbox; quedan para correr en el entorno del usuario antes o junto con el commit).
- **Login por cédula + recuperación de contraseña: COMPLETO en la base local y en Neon (producción).** El dato de ingreso principal pasó de correo a **cédula** (`src/auth.ts`, `cedula` ya era único en `User`) — el correo se conserva como dato de contacto y como canal de recuperación. Nuevo modelo `PasswordResetToken` (token de un solo uso, expira en 1 hora) vía migración `20260818004842_password_reset_tokens`, aplicada a Neon con `prisma migrate deploy`. Flujo: `/login` → enlace "¿Olvidaste tu contraseña?" → `/forgot-password` (el usuario ingresa su cédula; la respuesta es siempre genérica, exista o no la cédula, para no revelar qué cédulas están registradas) → si existe, se envía un correo con el enlace al correo *registrado en la cuenta* (`sendPasswordResetEmail` en `src/lib/mailer.ts`) → `/reset-password?token=...` para definir la nueva contraseña (rechaza tokens inválidos, ya usados o expirados).
  - De paso se corrigió un bug real preexistente de Fase 1: `/formulario/actualizar` (y `GET`/`PATCH /api/account`) seguían consultando el campo `codigoFicha`, eliminado en la migración de Fase 1 — quedaba roto desde entonces porque ningún flujo de prueba anterior había llegado a ejercitar esa página. Ahora usa la relación `ficha.codigo`.
  - Verificado en vivo de punta a punta con llamadas directas a la API (no solo por UI, para descartar problemas de automatización del navegador): `POST /api/auth/forgot-password` → correo real recibido con el enlace correcto → `POST /api/auth/reset-password` con el token real (200) → `POST /api/auth/callback/credentials` con cédula + contraseña nueva → sesión iniciada correctamente. También se confirmó el rechazo correcto de enlaces sin token, con token inventado, y con token ya usado.
  - Pendiente igual que Fase 1: `npm run lint` / `npx tsc --noEmit` / `npm run build` completos en el entorno del usuario antes del commit. Además, confirmar que `APP_URL` esté configurada en Vercel para `ep.mkdirection.com` (en local se agregó a `.env.local`); sin ella el enlace de recuperación en producción saldría relativo/roto.
- Fases 2-6: pendientes.

---

## Qué ya está construido

- Registro y login de aprendices (NextAuth v5 + Prisma adapter).
- Perfil de empresa (`CompanyProfile`) con datos del coformador.
- Primer micro-proceso: **Concertación de funciones** (`ConcertacionFuncion`) — agenda fecha/hora, genera reunión (Google Meet vía Calendar, o Jitsi de respaldo), guarda `googleEventId`, valida choques de horario.
- Envío de correo de citación (`src/lib/mailer.ts`) al agendar la concertación.
- Envío de correo de bienvenida (`sendWelcomeEmail`) al registrarse, con usuario y contraseña de acceso.
- Panel autenticado del aprendiz (`/formulario/(panel)`) con página de "etapa-productiva" y "actualizar" datos.
- Botón de salida del proceso en el menú lateral del panel (`PanelSidebar`), con menú fijo (sticky) al hacer scroll.

Esto cubre, en el lenguaje del documento de requisitos: inscripción (3.1, parcial — ya incluye la notificación de creación de cuenta), Evaluación 1 / Concertación (3.2 y 3.3, primera reunión oficial).

> **Nota de seguridad pendiente:** el correo de bienvenida envía la contraseña en texto plano (requerimiento explícito). El correo no es un canal cifrado que controlemos, así que a futuro conviene reemplazarlo por un enlace de "activa tu cuenta / crea tu contraseña" de un solo uso, sin transmitir la contraseña real.

## Qué falta frente al documento de requisitos validado

1. ~~**Roles de usuario** — hoy `User` no distingue aprendiz/instructor/coordinador. No hay instructor asignado a un aprendiz.~~ **Resuelto en Fase 1** (ver arriba: modelo `Ficha`, asignación instructor↔ficha, autorización por rol).
2. **Estado del aprendiz** (`Activo` / `Certificado`) — no existe el campo.
3. **Fecha de inicio de Etapa Productiva** — no hay un campo explícito que dispare los cálculos de plazos (bitácoras cada 15 días, evaluaciones, etc.). Actualmente solo existe la fecha de la reunión de concertación.
4. **Bitácoras** (cada 15 días, ~12 en total, formato `GFPI-F-147`) — no existe el modelo.
5. **Evaluación 2 y 3** (seguimiento, a los ~2 meses y al cierre) — solo existe la Evaluación 1 (Concertación). Falta generalizar el patrón de `ConcertacionFuncion` a las 3 evaluaciones con formato `GFPI-F-023_V06` y convención de calificación **A/D/P**.
6. **Reunión de cierre** (10-15 días antes de terminar) y **reunión extra a solicitud** — hoy solo hay una reunión (la de concertación); falta generalizar "Reunión" como concepto reutilizable con cancelación/reprogramación notificada a las partes.
7. **Certificación del empresario** (carta de terminación, evidencia de cierre) — no existe.
8. **Control de evaluaciones por aprendiz** (vista consolidada, sección 3.4) — no existe.
9. **Módulo de consultas y reportes** (sección 3.5: filtros, métricas, exportación PDF/Excel, acceso por rol) — no existe.
10. **Notificaciones de incumplimiento** (alertas + correo a aprendiz y coformador) — hoy solo hay correo de citación al agendar y correo de bienvenida al registrarse; falta la lógica de alertas por vencimiento.
11. Subida de evidencias con **plantilla descargable o firma cargada en la app** — no existe aún el manejo de archivos/firmas.

## Fases sugeridas

### Fase 0 — Modelo de datos
Extender `prisma/schema.prisma`:
- Agregar `role` a `User` (enum: `APRENDIZ`, `INSTRUCTOR`, `COORDINADOR`).
- Agregar `estado` a `User`/aprendiz (enum: `ACTIVO`, `CERTIFICADO`).
- Agregar `instructorId` (relación aprendiz → instructor) y `fechaInicioEtapaProductiva`.
- Generalizar `ConcertacionFuncion` en un modelo `Evaluacion` (o similar) con `numero` (1-3), `calificacion` (enum `A`/`D`/`P`), reutilizando los campos de reunión (fecha, hora, `videollamadaUrl`, `googleEventId`).
- Nuevo modelo `Bitacora` (aprendiz, número de secuencia 1-12, fecha límite, fecha de entrega, archivo, estado).
- Nuevo modelo `CertificacionEmpresario` (o campo/estado dentro de un modelo de cierre).
- Nuevo modelo `Reunion` genérico si se decide desacoplarlo de la evidencia (recomendado, dado que ahora hay 3 reuniones oficiales + extras).
- Correr `npx prisma migrate dev` y verificar en local antes de seguir.

### Fase 1 — Roles y asignación instructor↔aprendiz (COMPLETA)
- ~~Middleware/guardas de autorización por rol en las rutas API y en el panel.~~ → `src/lib/auth-guards.ts` (`requireUser`, `requireApiUser`, `getSessionUser`).
- ~~Vista de instructor: listar aprendices (todas las fichas en modo consulta; solo las propias para evaluar).~~ → `/formulario/instructor/aprendices`.
- ~~Vista de coordinador: gestión de usuarios, empresas y fichas.~~ → `/formulario/coordinador/fichas` (carga masiva de fichas + asignación de instructor por ficha; una ficha, un instructor como máximo).
- Detalle del diseño final y verificación en vivo: ver "Estado de avance" arriba.

### Fase 2 — Bitácoras
- CRUD de bitácoras: cálculo automático de las ~12 fechas límite desde `fechaInicioEtapaProductiva`.
- Subida de archivo (plantilla `GFPI-F-147` descargable + opción de firma en la app).
- Estados y alertas de incumplimiento (correo a aprendiz + coformador).

### Fase 3 — Evaluaciones 2 y 3 + reuniones
- Generalizar el flujo de `ConcertacionFuncion` a Evaluación 2 (2 meses) y Evaluación 3 (cierre, 10-15 días antes del fin).
- Reunión extra a solicitud (aprendiz o coformador).
- Cancelación/reprogramación con notificación a todas las partes.
- Calificación A/D/P por evaluación.

### Fase 4 — Certificación del empresario y cierre
- Subida de la carta de terminación (evidencia de cierre).
- Regla: bloquear/marcar la evaluación final como no emitible hasta tener esta certificación.
- Cuando todas las evidencias quedan en `A`: notificación al aprendiz para iniciar su certificación de estudio.
- Endpoint/acción para que aprendiz o instructor marquen el estado `Certificado`.

### Fase 5 — Control de evaluaciones por aprendiz
- Vista consolidada por aprendiz: bitácoras + 3 evaluaciones + certificación del empresario, con estado de cada una.

### Fase 6 — Consultas y reportes
- Filtros (ficha, empresa, instructor, estado, rango de fechas).
- Métricas agregadas (activos, certificados, cumplimiento, promedio evaluaciones, próximas fechas límite).
- Exportación PDF y Excel.
- Control de acceso: coordinador ve todo (solo consulta); instructor ve reportes de todos los aprendices.

---

## Cómo trabajar esto con Claude Code

1. Abre una terminal en la carpeta del proyecto y ejecuta `claude` (o `claude .`) para iniciar Claude Code ahí — así lee automáticamente `CLAUDE.md`, `AGENTS.md` y esta carpeta `docs/`.
2. Pide una fase a la vez, por ejemplo: *"Lee docs/PLAN-IMPLEMENTACION.md y docs/REQUISITOS-FUNCIONALES.md, y ejecuta la Fase 0: extiende prisma/schema.prisma según lo descrito, sin tocar código de UI todavía."*
3. Revisa el diff y corre `npx prisma migrate dev` antes de pasar a la siguiente fase.
4. Repite fase por fase. Si el alcance de una fase cambia, actualiza primero `docs/REQUISITOS-FUNCIONALES.md` y este plan, y luego pide a Claude Code que continúe — así el proyecto y la documentación no se desalinean.
