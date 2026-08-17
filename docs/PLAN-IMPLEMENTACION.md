# Plan de Implementación
## registro-empresa — de lo construido al alcance validado

**Fecha:** 16 de agosto de 2026
**Referencia funcional:** `docs/REQUISITOS-FUNCIONALES.md` (validado, sin puntos pendientes)

Este documento traduce el documento de requisitos ya validado en pasos de código concretos, comparando contra lo que ya existe en el repositorio. Está pensado para trabajarse con Claude Code **una fase a la vez**.

## Estado de avance

- **Fase 0 (modelo de datos): COMPLETA en la base local.** `prisma/schema.prisma` extendido de forma aditiva (sin romper `ConcertacionFuncion` = Evaluación 1, ya en uso): nuevos enums `Role`, `EstadoAprendiz`, `Calificacion`, `EstadoEvidencia`; nuevos campos en `User` (`role`, `estado`, `fechaInicioEtapaProductiva`, `instructorId`); nuevos modelos `Evaluacion` (evaluaciones 2 y 3), `Bitacora` y `CertificacionEmpresario`. Migración `20260816231953_fase0_roles_bitacoras_evaluaciones` aplicada a la base local y cliente de Prisma regenerado (v7.9.1). Backup del esquema anterior en `prisma/schema.prisma.bak-fase0`.
  - **Neon (producción): sincronizada.** Se limpiaron las tablas originales (creadas antes de usar el sistema de migraciones, sin historial) y se aplicó la migración completa vía `prisma migrate deploy`. Ambos entornos (local y Neon) están ahora en el mismo estado de esquema.
- Fase 1 (roles y asignación instructor↔aprendiz): siguiente en la fila.
- Fases 2-6: pendientes.

---

## Qué ya está construido

- Registro y login de aprendices (NextAuth v5 + Prisma adapter).
- Perfil de empresa (`CompanyProfile`) con datos del coformador.
- Primer micro-proceso: **Concertación de funciones** (`ConcertacionFuncion`) — agenda fecha/hora, genera reunión (Google Meet vía Calendar, o Jitsi de respaldo), guarda `googleEventId`, valida choques de horario.
- Envío de correo de citación (`src/lib/mailer.ts`) al agendar la concertación.
- Panel autenticado del aprendiz (`/formulario/(panel)`) con página de "etapa-productiva" y "actualizar" datos.

Esto cubre, en el lenguaje del documento de requisitos: inscripción (3.1, parcial), Evaluación 1 / Concertación (3.2 y 3.3, primera reunión oficial).

## Qué falta frente al documento de requisitos validado

1. **Roles de usuario** — hoy `User` no distingue aprendiz/instructor/coordinador. No hay instructor asignado a un aprendiz.
2. **Estado del aprendiz** (`Activo` / `Certificado`) — no existe el campo.
3. **Fecha de inicio de Etapa Productiva** — no hay un campo explícito que dispare los cálculos de plazos (bitácoras cada 15 días, evaluaciones, etc.). Actualmente solo existe la fecha de la reunión de concertación.
4. **Bitácoras** (cada 15 días, ~12 en total, formato `GFPI-F-147`) — no existe el modelo.
5. **Evaluación 2 y 3** (seguimiento, a los ~2 meses y al cierre) — solo existe la Evaluación 1 (Concertación). Falta generalizar el patrón de `ConcertacionFuncion` a las 3 evaluaciones con formato `GFPI-F-023_V06` y convención de calificación **A/D/P**.
6. **Reunión de cierre** (10-15 días antes de terminar) y **reunión extra a solicitud** — hoy solo hay una reunión (la de concertación); falta generalizar "Reunión" como concepto reutilizable con cancelación/reprogramación notificada a las partes.
7. **Certificación del empresario** (carta de terminación, evidencia de cierre) — no existe.
8. **Control de evaluaciones por aprendiz** (vista consolidada, sección 3.4) — no existe.
9. **Módulo de consultas y reportes** (sección 3.5: filtros, métricas, exportación PDF/Excel, acceso por rol) — no existe.
10. **Notificaciones de incumplimiento** (alertas + correo a aprendiz y coformador) — hoy solo hay correo de citación al agendar; falta la lógica de alertas por vencimiento.
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

### Fase 1 — Roles y asignación instructor↔aprendiz
- Middleware/guardas de autorización por rol en las rutas API y en el panel.
- Vista de instructor: listar aprendices (todas las fichas en modo consulta; solo las propias para evaluar).
- Vista de coordinador: gestión de usuarios, empresas y fichas.

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
