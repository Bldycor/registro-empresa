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
  - Excel con `write-excel-file`, solo en el servidor (`src/app/api/reportes/excel`). Los PDF (expediente, reportes) salen de la impresión del navegador, sin librería.
- **Lint:** ESLint (`npm run lint`). Hay un warning preexistente en `concertacion-form.tsx`; se tolera.

## Entorno — leer antes de probar cualquier cosa

- **`.env.local` apunta a la base de PRODUCCIÓN.** No hay base de desarrollo: todo lo que se haga desde localhost toca datos reales. Para probar, crear cuentas con cédulas `99000000xx` y contraseña `Scratch123!`, y borrarlas al terminar. **Nunca** cambiar la contraseña ni los datos de una cuenta real para probar.
- En local, `SMTP_*`, `EMAIL_FROM` y `GOOGLE_*` llegan enmascaradas como el texto literal `[SENSITIVE]`. El correo, Google Calendar y la subida a Vercel Blob **solo se pueden probar en producción**.
- `prisma.config.ts` solo carga `.env`, que apunta a una base local que ya no existe. Antes de cualquier comando de Prisma:
  `export DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | sed 's/^DATABASE_URL=//' | tr -d '"')`
- Las migraciones se escriben a mano, **solo aditivas**, y se aplican con `npx prisma migrate deploy` (seguido de `npx prisma generate`). Reiniciar el servidor de desarrollo después de regenerar el cliente.
- Despliegue: **Vercel publica en producción automáticamente cada push a `main`**, y crea un Preview por cada push a otra rama. Se trabaja en `fase2-gestion-evidencia-ep` y se pasa a `main` solo por avance directo: `git push origin HEAD:main`, que Git rechaza si no es fast-forward. `npx vercel deploy --prod --yes --scope bldycors-projects` también publica, pero sin pasar por `main`: evitarlo, porque así fue como `main` llegó a quedar 21 commits atrás de producción.
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
    reuniones.ts                  # títulos, destinatarios y choques de horario de las reuniones
    expediente.ts                 # expediente de un aprendiz (vista y PDF)
    reportes.ts                   # los tres reportes y sus filtros (pantalla y Excel)
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
- **Tope de aprendices por instructor** (§9.1.3): 80 aprendices activos. **Solo advierte**: al asignar un instructor a una ficha, o aprendices a una ficha, la respuesta trae `advertencias` y la asignación se hace igual; el panel de Instructores muestra la carga de cada uno (`src/lib/carga-instructor.ts`, `src/lib/tope-instructor.ts`).
- **Plazo de 24 meses** (§9.1.1 c, Acuerdo 007 de 2012): solo aplica a las fichas con `reglamento` = Acuerdo 007, que Coordinación marca en la ficha; se cuenta desde su «Inicio productiva». **Solo advierte**: en la solicitud de alternativa por avalar, en la lista de Aprendices y en el expediente. No bloquea ni suma como causal de deserción (`src/lib/plazo-culminacion.ts`).
- **Novedades** (§9.2; `src/lib/novedades.ts`, `/formulario/etapa-productiva/novedades` y `/formulario/instructor/novedades`): cualquier hecho que afecte el desarrollo de la práctica sin detenerla (cambio de coformador, de funciones o de sede, accidente, incapacidad corta, ARL…). **No es una evidencia:** no se avala, se registra. La registran el aprendiz o su instructor; el instructor puede además comentarla. Dos plazos, desde el día del hecho y en días hábiles, que **solo advierten**: 3 para registrarla y 5 para dejar constancia de que quedó anotada en la bitácora. La misma vista mide el plazo de registro de los aplazamientos e interrupciones ya existentes, que la guía también llama novedades.
- **Plan de mejoramiento** (§9.4): en pausa por decisión de Coordinación (15 sep 2026).

**Plantillas oficiales:** GFPI-F-147 (bitácora, Excel) y GFPI-F-023 (planeación, seguimiento y evaluación, Word) están en `public/documentos` y se enlazan en Bitácoras y Evaluaciones, del aprendiz y del instructor (`src/components/plantilla-enlace.tsx`). Si SENA publica una versión nueva, se reemplaza el archivo y se actualiza el nombre ahí.

**Citaciones a reuniones** (`sendCitacionEmail`, redacción en `src/lib/citacion-correo.ts`):
- Momento 1 (Concertación): Coordinación (`CITACION_EMAIL`), instructor de la ficha, aprendiz y coformador. Momentos 2 y 3: instructor, aprendiz y coformador.
- Siempre sale el correo propio de SEPA, aunque Google Calendar esté configurado o falle (en ese caso el enlace cae a Jitsi).
- Al reprogramar (requisito §3.2) el correo dice «Reunión reprogramada» y muestra el horario anterior y el nuevo. La invitación `.ics` lleva UID fijo por reunión y SEQUENCE creciente, así que actualiza el evento en vez de duplicarlo, y su hora va en UTC ya convertida desde Colombia (en Vercel el reloj corre en UTC). Una dirección inválida queda fuera de la invitación, y si la invitación no se puede armar, el correo sale sin el adjunto.
- Quién recibe cada citación, sus reprogramaciones y su recordatorio sale de un solo lugar: `destinatariosReunion` en `src/lib/reuniones.ts`.
- El **instructor** también reprograma (`PATCH /api/instructor/reuniones/[id]`, desde «Evaluaciones» y «Reuniones extraordinarias»): la Concertación y los Momentos mientras no los haya finalizado, y las extraordinarias ya aprobadas. Revisa choques contra toda su agenda (`franjasOcupadasInstructor`; en la Concertación, también contra las demás concertaciones, porque Coordinación las acompaña todas), conserva el enlace de la videollamada, y el aviso dice quién la movió y, si lo escribió, por qué.
- **Recordatorio** (`src/lib/recordatorio-reuniones.ts`, en la misma tarea diaria de los avisos de plazo): uno por reunión y horario, a los mismos destinatarios de la citación. Sale el día anterior; si la reunión se agendó o se movió después de la tarea de ese día, sale el mismo día, siempre que no haya empezado. Cubre la Concertación y los Momentos mientras no estén finalizados y las extraordinarias aprobadas, y nunca a procesos cerrados (Certificado o Desertó). Queda en `AvisoPlazo` con tipo `RECORDATORIO_REUNION`; al reprogramar, el nuevo horario tiene su propio recordatorio.

**Reunión extraordinaria** (requisito §3.2; `src/app/api/etapa-productiva/extraordinarias` y `src/app/api/instructor/extraordinarias`):
- La agenda el aprendiz, a nombre propio o del coformador, con fecha, franja y motivo. El instructor la aprueba o la rechaza (con nota obligatoria). La citación con enlace a todos sale **solo al aprobarla**: así el coformador no recibe invitaciones a reuniones que después no se hacen.
- Se guarda como `Evaluacion` con `esExtraordinario` y `numero` 0: sin rúbrica, y no cuenta para el semáforo, la insignia roja ni «Por certificar». Toda consulta de los Momentos debe filtrar `esExtraordinario: false`.
- Una sola solicitud pendiente a la vez; el aprendiz puede retirarla mientras no tenga respuesta. Mientras está pendiente o aprobada ocupa la franja del instructor; rechazada la libera (`ocupaFranja` en `src/lib/reuniones.ts`).

**Avisos de plazo por correo** (`src/app/api/cron/avisos-plazo`, tarea diaria de Vercel en `vercel.json`, 8 a. m. de Colombia):
- Cubre bitácoras y los Momentos 1, 2 y 3 (requisito §3.3). Avisa al entrar en los 5 días previos (o el mismo día) y al vencer, **una sola vez** por entrega y tipo: la tabla `AvisoPlazo` es a la vez el control de repetición y el registro histórico.
- Va al aprendiz con **copia al instructor** de la ficha; el **coformador** va en copia solo en los avisos de vencido. Solo aprendices `ACTIVO`.
- «Entregado» significa lo que depende del aprendiz: una bitácora enviada (aunque no esté revisada) o un Momento agendado. Una bitácora rechazada cuenta como no entregada. Con el mínimo de bitácoras cumplido, no se avisa por las restantes.
- Doble interruptor: `CRON_SECRET` y `NOTIFICACIONES_ACTIVAS=true` (variables de producción en Vercel). Con sesión de Coordinación la ruta solo simula; `?simular=1` fuerza la simulación también con la clave. La redacción del correo es una función pura (`src/lib/aviso-plazos-correo.ts`), porque es lo único que se puede probar en local.
- Al activarlos (14 sep 2026), Coordinación decidió no avisar lo que ya estaba vencido: se marcó como avisado sin enviar correo (`POST` a la misma ruta).

**Expediente del aprendiz** (requisitos §3.4, guía §9.5; `src/lib/expediente.ts` y `src/components/expediente-aprendiz.tsx`):
- Todo el proceso de un aprendiz en una sola vista de solo lectura: datos y empresa, el semáforo de las seis evidencias (el mismo `calcularSeguimiento`), cada evidencia con quién la revisó y cuándo, la rúbrica de cada Momento, las reuniones extraordinarias, las novedades y los avisos enviados por correo.
- La ven el instructor (de cualquier aprendiz, como su lista de Aprendices), Coordinación y Admin en `/formulario/expediente/[id]`, y el aprendiz el suyo en la pestaña «Expediente».
- Se descarga con «Imprimir o guardar en PDF» del navegador, sin librería de PDF: al imprimir se ocultan el encabezado y los menús (`print:hidden`), y el modo oscuro solo aplica en pantalla (`@custom-variant dark` en `globals.css`), así que el PDF sale en claro.

**Reportes** (requisitos §3.5; `src/lib/reportes.ts`, `/formulario/reportes` y `/api/reportes/excel`):
- Tres reportes que se reparten la información para no repetirla: **Métricas** (solo totales: aprendices por estado, bitácoras a tiempo y aprobadas, rúbrica en «Satisfactorio», juicio final), **Cumplimiento** (cada evidencia en conjunto y la lista de aprendices en riesgo: evidencias atrasadas o causal de deserción) y **Listado** (una fila por aprendiz con su avance).
- Una sola consulta (`construirReporte`) alimenta la pantalla y el Excel, con los mismos filtros: ficha, instructor, empresa, estado y rango de la fecha de inicio de la EP. Los filtros van en la URL (formulario GET).
- Solo consulta. Los ven el instructor —de todos los aprendices, no solo de sus fichas— y Coordinación y Admin.
- Excel real (`.xlsx`, librería `write-excel-file`, solo en el servidor) con una hoja por reporte; el PDF sale de «Imprimir o guardar en PDF», igual que el expediente.
- Métricas incluye también las **novedades** (§9.2): cuántas se registraron, qué porcentaje dentro de los 3 días hábiles y cuántas siguen sin anotar en bitácora; más dos alertas institucionales: aprendices fuera del plazo de 24 meses e instructores por encima del tope de 80 (esta última sobre todo el centro, no sobre el filtro). El listado trae por aprendiz sus novedades, las que quedaron fuera de plazo y la alerta de plazo.
- El menú lateral va **agrupado por tarea** (`roleNav` en `src/components/panel-sidebar.tsx`): Seguimiento / Evidencias por revisar / Reuniones y novedades / Consultas / Cuenta en el instructor, y Estructura / Aprendices / Novedades / Consultas / Cuenta en Coordinación y Admin.

**Cuentas — riesgo aceptado:** las cuentas que crea otro rol reciben como contraseña inicial su cédula, que es también el usuario, y el correo de bienvenida la envía en texto plano. Coordinación ratificó las dos decisiones el 14 de septiembre de 2026, sabiendo que 23 de 37 cuentas (incluidos los 2 coordinadores) seguían con la cédula como contraseña. No cambiarlo ni volver a proponerlo sin que Coordinación lo pida.

## Roadmap

El detalle está en `docs/PLAN-IMPLEMENTACION.md`. De la guía GFPI-G-040 solo queda el plan de mejoramiento (§9.4), en pausa por decisión de Coordinación.

Trabajar un frente a la vez, y aplicar y probar cada migración antes de construir la interfaz encima.
