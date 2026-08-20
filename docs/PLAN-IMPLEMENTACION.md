# Plan de Implementación
## registro-empresa — de lo construido al alcance validado

**Fecha:** 17 de agosto de 2026 (última actualización: 19 de agosto de 2026)
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
  - Cierre de fase (lint/build/commit/push): ver bullet "Cierre de este ciclo de trabajo" más abajo.
- **Login por cédula + recuperación de contraseña: COMPLETO en la base local y en Neon (producción).** El dato de ingreso principal pasó de correo a **cédula** (`src/auth.ts`, `cedula` ya era único en `User`) — el correo se conserva como dato de contacto y como canal de recuperación. Nuevo modelo `PasswordResetToken` (token de un solo uso, expira en 1 hora) vía migración `20260818004842_password_reset_tokens`, aplicada a Neon con `prisma migrate deploy`. Flujo: `/login` → enlace "¿Olvidaste tu contraseña?" → `/forgot-password` (el usuario ingresa su cédula; la respuesta es siempre genérica, exista o no la cédula, para no revelar qué cédulas están registradas) → si existe, se envía un correo con el enlace al correo *registrado en la cuenta* (`sendPasswordResetEmail` en `src/lib/mailer.ts`) → `/reset-password?token=...` para definir la nueva contraseña (rechaza tokens inválidos, ya usados o expirados).
  - De paso se corrigió un bug real preexistente de Fase 1: `/formulario/actualizar` (y `GET`/`PATCH /api/account`) seguían consultando el campo `codigoFicha`, eliminado en la migración de Fase 1 — quedaba roto desde entonces porque ningún flujo de prueba anterior había llegado a ejercitar esa página. Ahora usa la relación `ficha.codigo`.
  - Verificado en vivo de punta a punta con llamadas directas a la API (no solo por UI, para descartar problemas de automatización del navegador): `POST /api/auth/forgot-password` → correo real recibido con el enlace correcto → `POST /api/auth/reset-password` con el token real (200) → `POST /api/auth/callback/credentials` con cédula + contraseña nueva → sesión iniciada correctamente. También se confirmó el rechazo correcto de enlaces sin token, con token inventado, y con token ya usado.
- **Mejora de UX en el panel de fichas del coordinador: COMPLETA.** Cada ficha en `/formulario/coordinador/fichas` ahora tiene una flecha desplegable que muestra los aprendices asignados (nombre, cédula, estado) antes de elegir el instructor — evita asignar "a ciegas". Requirió exponer `aprendices` en el `select` de `GET /api/coordinador/fichas` y en la carga inicial de la página.
- **Cierre de este ciclo de trabajo (Fase 1 + login por cédula/recuperación + mejora de UX de fichas): COMPLETO end-to-end.**
  - `npm run lint`: 0 errores (1 warning preexistente en `concertacion-form.tsx`, no relacionado con estos cambios).
  - `npm run build`: compiló limpio, TypeScript en verde, las 20 rutas generadas (incluye `/api/auth/forgot-password`, `/api/auth/reset-password`, `/forgot-password`, `/reset-password`, `/api/coordinador/*`).
  - Variable `APP_URL=https://ep.mkdirection.com` configurada en Vercel (Production) y confirmada tras redeploy.
  - Commit `0963bb7` ("Agregar roles/fichas (aprendiz-instructor), login por cedula y recuperacion de contrasena") empujado a `main` en GitHub; Vercel disparó el deployment de producción con el código actualizado.
  - Autoevaluación de código (17-18 ago): revisión línea por línea de `auth.ts`, `auth-guards.ts`, las rutas de `forgot-password`/`reset-password`, `register`, `fichas` (pública y de coordinador/instructor), `validations.ts`, `mailer.ts` y `schema.prisma` — todo consistente entre sí (schema ↔ selects de Prisma ↔ tipos de TypeScript ↔ validaciones Zod), sin referencias colgantes al viejo campo `codigoFicha` ni al viejo campo directo `User.instructorId` de Fase 0 (reemplazado correctamente por `Ficha.instructorId`). Sin hallazgos nuevos.
- **Separación de registro por rol: COMPLETA en la base local y en Neon (producción).** El formulario público único (aprendiz/instructor/coordinador con un selector) se dividió en tres flujos independientes, porque instructor y coordinador ya no son autoregistro libre:
  - `/register` — solo Aprendiz. Ya no tiene selector de rol.
  - ~~`/register-coordinador` — autoregistro de Coordinador~~ **eliminado por completo más adelante en el mismo día** (ver bullet "Cierre de autoregistro de coordinador + rol ADMIN" más abajo): resultó ser una falla de seguridad real — cualquiera podía crear una cuenta de coordinador — y de hecho alguien la usó en producción antes de que se cerrara (ver ese mismo bullet).
  - Instructor — **ya no se autoregistra**. Lo crea el Coordinador desde `/formulario/coordinador/instructores` (`POST /api/coordinador/instructores`): genera una contraseña temporal, la envía por correo (mismo mecanismo que `sendWelcomeEmail`) y la muestra una vez en pantalla como respaldo. Ese mismo panel permite **editar** los datos de un instructor ya creado (`PATCH /api/coordinador/instructores/[id]`).
  - Dos campos nuevos en `User`: `comuna` (enum `Comuna`, las 16 comunas oficiales de Medellín — reemplaza el viejo campo de "barrio" en texto libre) y `coordinacion` (enum `Coordinacion`: Contabilidad y Finanzas / Comercio y Ventas / Gestión Administrativa y Documental — aplica a Instructor y Coordinador). Migración `20260818140000_comuna_coordinacion`.
  - Verificado en vivo de punta a punta: creación de coordinador, coordinador crea instructor (contraseña temporal funcional), instructor edita sus propios datos, aprendiz se registra con comuna — los tres logins funcionan.
- **Gestión completa de fichas (estado, nivel, jornada y fechas institucionales): COMPLETA en la base local y en Neon (producción).** El modelo `Ficha` (hasta ahora solo `codigo`/`programa`/`instructorId`) se amplió con los datos que los instructores llevaban en una hoja de cálculo de control aparte (que este trabajo reemplaza):
  - Campos nuevos: `estado` (enum `EstadoFicha`: `EN_EJECUCION` / `TERMINADA` / `TERMINADA_POR_FECHA` — son dos hitos distintos, no sinónimos: `TERMINADA` = venció el plazo límite para iniciar EP sin haberla iniciado; `TERMINADA_POR_FECHA` = ya se cumplió la fecha de fin de formación), `nivelFormacion` (Técnico/Tecnólogo/Auxiliar), `jornada`, `fechaInicioFicha` y `fechaFinFormacion` (estas dos se diligencian a mano). Migración `20260818150000_gestion_fichas`.
  - **`fechaInicioProductiva` y `fechaLimiteIniciarEP` NO se editan a mano — se calculan siempre en el servidor** (`src/lib/ficha-fechas.ts`) con la fórmula oficial confirmada por el coordinador: Inicio Productiva = Fecha Inicio Ficha + 181 días calendario (Técnico) o + 631 días (Tecnólogo); Límite para Iniciar EP = Fecha Fin de Formación + 361 días calendario (ambos niveles). No hay fórmula definida para Auxiliar — queda `null`. El cálculo se dispara solo al crear/editar (import y `PATCH /api/coordinador/fichas/[id]`), nunca se toma literal de una fuente externa.
  - **Importante:** esta fecha institucional vive **a nivel de ficha** (todos los aprendices de una ficha comparten la misma fecha de inicio de Etapa Productiva), a diferencia de `User.fechaInicioEtapaProductiva` (Fase 0, por aprendiz), que sigue sin usarse — ver punto 3 de "Qué falta" más abajo, actualizado con este hallazgo.
  - **Importación masiva desde hoja de cálculo** (`POST /api/coordinador/fichas/import`, bloque "Importar desde hoja de cálculo" en el panel): pegar directo un rango copiado de la hoja (con o sin fila de encabezado — si hay encabezado, mapea columnas por nombre; ignora a propósito las columnas de vigencia de acuerdo 007/009). **Solo crea fichas nuevas — nunca sobrescribe una que ya exista**; los códigos que ya estaban se listan aparte ("ya existían") para que el coordinador los revise a mano. Reporta errores fila por fila (estado/nivel/jornada no reconocido, fecha mal formada) sin bloquear el resto del lote.
  - **Migración real de datos históricos:** se importaron 20 fichas reales de la hoja de control (seleccionadas por tener "Límite para Iniciar EP" en 2026 y código sin duplicar en la hoja) y luego se recalcularon con la fórmula oficial (los valores cambian respecto al histórico de la hoja, confirmado como comportamiento esperado).
  - **Panel de fichas — selección y acciones masivas:** checkbox por ficha + "seleccionar todas las visibles", filtro por código y por "sin instructor asignado", y una barra de acción para asignar un instructor a varias fichas seleccionadas de una vez (`POST /api/coordinador/fichas/asignar-instructor`), en vez de una por una.
  - **Eliminar ficha** (con confirmación inline obligatoria, no se puede deshacer): borra la ficha y sus datos de gestión. Los aprendices que la tenían asignada **no se borran** — solo quedan sin ficha (`fichaId` a `null`); cuentas, login, evaluaciones y bitácoras se conservan intactas. Decisión de diseño confirmada explícitamente por el coordinador antes de implementarla.
  - Verificado en vivo de punta a punta (incluyendo casos negativos): importación con filas inválidas y con códigos duplicados, edición de fecha recalculando Inicio Productiva al instante, asignación masiva a 2 fichas seleccionadas, borrado de una ficha con aprendiz confirmando que su cuenta sigue con login funcional después.
  - Bug encontrado y corregido en el camino: las fechas de ficha se mostraban un día antes en el resumen de solo lectura (conversión a zona horaria local del navegador sobre una fecha guardada a medianoche UTC); y la cédula quedaba vacía en la tarjeta de un instructor recién creado (faltaba en el `select` de la respuesta del POST).
- **Cierre de este ciclo de trabajo (registro por rol + gestión de instructores + gestión de fichas): COMPLETO end-to-end.**
  - `npm run lint`: 0 errores (mismo warning preexistente de siempre en `concertacion-form.tsx`).
  - `npm run build`: compiló limpio, TypeScript en verde, 30 rutas generadas.
  - Commit `7a204de` ("Separar registro por rol, gestion de instructores y gestion completa de fichas") empujado a `main` en GitHub; Vercel disparó el deployment de producción con el código actualizado.
- **Importación masiva e "eliminar" para instructores: COMPLETA.** Mismo patrón que ya existía para fichas: `POST /api/coordinador/instructores/import` (pegar filas de una hoja de cálculo, con o sin encabezado; solo crea cuentas nuevas, reporta cédulas/correos que ya existían en **cualquier** rol del sistema, no solo instructor). "Eliminar instructor" con confirmación inline: borra la cuenta; las fichas que tenía asignadas quedan sin instructor (`instructorId` a `null`) sin borrarse.
- **Cierre de autoregistro de coordinador + rol ADMIN: COMPLETO en la base local y en Neon (producción).** Se detectó en vivo que `/register-coordinador` (público, sin autenticación) seguía activo en producción y de hecho una cuenta real se creó por ahí ese mismo día (Zaby Esther Bendeck Orozco, coordinador) — confirmó la urgencia del cierre.
  - `/register-coordinador` (página + `POST /api/register-coordinador`) **eliminados por completo** — ambos devuelven 404, verificado en vivo.
  - Nuevo rol `ADMIN` en el enum `Role`: es el **único** que puede crear/editar/eliminar cuentas de Coordinador, desde el nuevo panel `/formulario/admin/coordinadores` (mismo patrón que el panel de instructores: crear, editar, eliminar con confirmación, importar desde hoja de cálculo). Además tiene acceso a Fichas, Instructores y Aprendices igual que un Coordinador ("control total", confirmado explícitamente). No existe ni existirá un formulario público para crear el primer ADMIN — el primero se promovió directamente por base de datos: la cuenta real `bladyco@gmail.com` (cédula `85456099`, ya coordinador) ahora es ADMIN, mismo login de siempre.
  - Verificado con pruebas negativas, no solo positivas: un Coordinador normal que intenta entrar a `/formulario/admin/coordinadores` es redirigido, y `GET /api/admin/coordinadores` le devuelve 403 — la protección es real a nivel de API, no solo de interfaz.
  - **Trazabilidad:** nuevo campo `User.creadoPorId` (auto-relación, `onDelete: SetNull`) — cada Coordinador creado por un Admin y cada Instructor creado por un Coordinador queda con un registro de quién lo creó, visible como "Creado por: X" en ambos paneles.
  - **Contraseña temporal = cédula:** para cuentas de Coordinador/Instructor creadas por otro rol (nunca para Aprendiz, que sigue eligiendo su propia contraseña), la contraseña inicial autogenerada ahora es la misma cédula (antes era una cadena aleatoria) — decisión explícita del coordinador para simplificar la comunicación en el primer ingreso. **No es retroactivo**: las cuentas ya existentes conservan su contraseña actual (se confirmó explícitamente no tocar ni siquiera la cuenta real del propio Admin).
  - Migraciones `20260819120000_admin_role_creado_por`.
- **Panel de gestión de Aprendices: COMPLETO.** Nuevo `/formulario/coordinador/aprendices` (Coordinador y Admin): lista **todos** los aprendices, tengan o no ficha asignada (con badge ámbar "Sin ficha asignada" para los que no la tienen). Filtro por nombre/cédula, por ficha específica, o solo "sin ficha asignada". "Editar datos" cubre todo el ciclo de cambio en un solo formulario: datos personales, comuna, estado (Activo/Certificado), y **reasignar o desasignar la ficha**. "Eliminar" con confirmación que deja explícito que, a diferencia de borrar una ficha o un instructor, acá sí se pierde el historial completo del aprendiz (perfil de empresa, concertación, evaluaciones, bitácoras — todas con cascada ya definida en el esquema).
- **Campo "Alternativa de Etapa Productiva": COMPLETO.** Nuevo enum `AlternativaEtapaProductiva` (Contrato de aprendizaje / Contrato vínculo formativo / Monitoría / Proyecto productivo / Vínculo laboral) en `User`. Obligatorio como desplegable en `/register` (verificado que el registro se rechaza si falta), editable después desde el panel de Aprendices. Migración `20260819160000_alternativa_etapa_productiva`.
- **Encabezado del panel:** ahora muestra el nombre del usuario en vez del correo electrónico (`src/app/formulario/layout.tsx`).
- **Cierre de este ciclo de trabajo (cierre de autoregistro coordinador + rol ADMIN + gestión de aprendices + alternativa EP): COMPLETO end-to-end.**
  - `npm run lint`: 0 errores (mismo warning preexistente de siempre en `concertacion-form.tsx`).
  - `npm run build`: compiló limpio, TypeScript en verde, 36 rutas generadas.
  - Commit `3228094` empujado a `main` en GitHub; Vercel disparó el deployment de producción con el código actualizado.
- Fases 2-6: pendientes. **Próxima fase sugerida: Fase 2 — Bitácoras** (ver detalle abajo, ya tiene un adelanto: la fecha institucional de inicio de Etapa Productiva por ficha).

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
2. **Estado del aprendiz** (`Activo` / `Certificado`) — el campo (`User.estado`, enum `EstadoAprendiz`) ya existe desde Fase 0 y por defecto queda en `ACTIVO`, pero todavía no hay ningún endpoint/UI para pasarlo a `CERTIFICADO` (eso depende de que todas las evidencias queden en `A`, ver Fase 4).
3. **Fecha de inicio de Etapa Productiva** — **parcialmente resuelto.** `Ficha.fechaInicioProductiva` ya existe y se calcula automáticamente (Técnico +181d / Tecnólogo +631d desde `fechaInicioFicha`, ver "Estado de avance") — es una fecha **institucional, a nivel de ficha**, no por aprendiz. El campo `User.fechaInicioEtapaProductiva` (Fase 0, por aprendiz) sigue sin usarse y probablemente ya no haga falta: Fase 2 debe decidir si las 12 fechas límite de bitácoras se calculan desde `Ficha.fechaInicioProductiva` (compartida por todos los aprendices de la ficha, más simple y consistente con cómo ya lo maneja el coordinador) o si se necesita una fecha individual por aprendiz para casos excepcionales.
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
- Ya construido de adelanto: `Ficha.fechaInicioProductiva` (institucional, calculada automáticamente — ver "Estado de avance" y punto 3 de "Qué falta"). Definir si las bitácoras se calculan desde ahí o si aún hace falta algo por aprendiz.
- CRUD de bitácoras: cálculo automático de las ~12 fechas límite (cada 15 días) desde `fechaInicioProductiva`.
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
