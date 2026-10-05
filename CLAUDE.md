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
  - Google Calendar/Meet (`@googleapis/calendar`, solo el cliente de Calendar: 2 MB en vez de los más de 200 MB de `googleapis`), OAuth en `src/app/api/google/*` (solo ADMIN, con `state` en cookie), lógica en `src/lib/google-calendar.ts` y `src/lib/video.ts`. Si Google falla, cae a **Jitsi Meet** y el correo se envía igual.
  - Correo con `nodemailer` (`src/lib/mailer.ts`) e invitaciones `.ics` con la librería `ics`.
  - Archivos adjuntos en **Vercel Blob** (`src/app/api/upload`, `src/components/file-upload-field.tsx`).
  - Excel con `write-excel-file`, solo en el servidor (`src/app/api/reportes/excel`). Los PDF (expediente, reportes) salen de la impresión del navegador, sin librería.
- **Lint:** ESLint (`npm run lint`), sin errores. Quedan dos avisos tolerados del React Compiler por usar `watch()` de react-hook-form (`concertacion-form.tsx` y `company-profile-form.tsx`).

## Seguridad y trazabilidad (4 oct 2026)

- **Rastro de auditoría automático** (`RegistroAuditoria`, `src/lib/auditoria.ts`): `prisma` de `src/lib/prisma.ts` es el cliente base (`src/lib/prisma-base.ts`) con una extensión que anota **toda creación, cambio o borrado** —quién (de la sesión), rol, IP, entidad, id y datos enviados—. Se escribe con `after()`, después de responder, así que no frena nada; si falla, no tumba la operación. Las claves que parecen secretos (`password`, `hash`, `token`, `secret`) se guardan como «[oculto]» y los textos largos se recortan. No se auditan `RegistroAuditoria`, `AvisoPlazo` ni `PasswordResetToken`. Sin llaves foráneas: el rastro sobrevive al borrado del usuario. Para escribir sin auditar (contadores de ingreso, el propio rastro) se usa `prismaBase`. Eventos explícitos con `registrarAuditoria()`: `INGRESO`, `INGRESO_FALLIDO`, `CUENTA_BLOQUEADA`, `INGRESO_BLOQUEADO`, `RECUPERACION_SOLICITADA`.
- **Pantalla «Trazabilidad»** (`/formulario/coordinador/auditoria`, Coordinación y Admin): filtros por persona, acción, entidad y fechas; solo consulta.
- **Ingreso:** 5 contraseñas erradas seguidas bloquean la cuenta 15 minutos (`User.intentosFallidos`, `bloqueadoHasta`; la pantalla de ingreso lo dice con `code: "bloqueada"`). Restablecer la contraseña levanta el bloqueo. La sesión dura **12 horas**. El JWT lleva el rol solo para el rastro; los permisos se leen siempre de la base.
- **Cabeceras de seguridad** en `next.config.ts` (no incrustar en otros sitios, `nosniff`, HSTS, `Referrer-Policy`, `Permissions-Policy`). Subidas a Vercel Blob con tope de **10 MB**. Recuperación de contraseña: un enlace cada 2 minutos por cuenta.
- Todas las rutas de API exigen rol con `requireApiUser`; las únicas públicas son registro, recuperar/restablecer contraseña y la lista de fichas del registro.

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
- **`Empresa`** — catálogo de empresas co-formadoras: **una empresa = un NIT** (`nit` único, normalizado «811045607-6»), con nombre, dirección, departamento y municipio. Solo la crea y edita el **ADMIN**.
- **`CompanyProfile`** — la empresa de cada aprendiz (enlazada al catálogo con `empresaId`) y su coformador. Nombre, dirección y NIT son una **copia** de la empresa del catálogo, sincronizada cada vez que el administrador la edita (`sincronizarPerfiles`), para que todo lo que ya los leía siga igual. El coformador **no tiene cuenta**: su firma consta en los documentos adjuntos, y sus datos los sigue escribiendo cada aprendiz (en una misma empresa puede tener un jefe distinto).
- **Las seis evidencias**, todas con `EstadoEvidencia` (`PENDIENTE` / `APROBADA` / `RECHAZADA`) y `avaladoPor` + `fechaAval`:
  `SeleccionAlternativaEP` (GFPI-F-165, la avala Coordinación) · `FormalizacionEtapaProductiva` · `ConcertacionFuncion` (Momento 1, con valoración `ConcertacionVariable`) · `Bitacora` (+ `BitacoraActividad`, GFPI-F-147) · `Evaluacion` (Momentos 2 y 3, rúbrica `EvaluacionVariable`, GFPI-F-023) · `CertificacionEmpresario`.
- **Novedades:** `InterrupcionEtapaProductiva` (se cambia de alternativa) y `AplazamientoEtapaProductiva` (se vuelve con la misma).
- **`PlanMejoramiento`** — plan de mejoramiento del §9.4, con su `EstadoPlanMejoramiento` (`POR_AUTORIZAR` → `VIGENTE` → `CUMPLIDO`/`NO_CUMPLIDO`, o `DEVUELTO` al instructor). No es una evidencia: no se avala, se autoriza, se cumple y queda como constancia.

## Identidad visual y navegación

- **Paleta SENA en `src/app/globals.css`.** La app se construyó sobre la escala `zinc` y el acento `emerald`; en vez de reescribir las clases de 84 pantallas, el bloque `@theme` redefine qué color es cada peldaño: los neutros pasan al azul institucional (#00304D) y los acentos al verde SENA (#39A900). Hay además colores propios por nombre: `bg-sena`, `hover:bg-sena-oscuro`, `bg-sena-claro`, `bg-azul`. **Cambiar la identidad se hace ahí, no en los componentes.**
- **El verde es solo para acciones y elementos activos** (`bg-sena`): botones, la opción activa del menú, el día elegido en un calendario. **Nunca como fondo de una tarjeta o de una lista** — un `dark:bg-sena` en un contenedor pinta la pantalla entera de verde y deja el contenido ilegible (pasó en Fichas, Instructores, Coordinadores, Competencias y Novedades; corregido el 28 sep 2026). El fondo de tarjeta es `bg-white` / `dark:bg-zinc-900`. El encabezado es la barra azul con la marca SEPA, el nombre del usuario, «Ayuda» y «Cerrar sesión» — la única forma de salir.
- **Menús agrupados por tarea y plegables** (`roleNav` en `src/components/panel-sidebar.tsx` y `TABS` en `evidencia-ep-nav.tsx`). **Contadores naranjas** de lo que espera acción en cada bandeja (`src/lib/pendientes-menu.ts`: evidencias `PENDIENTE` de las fichas del instructor —un Momento solo cuando la reunión ya pasó—, planes devueltos; en Coordinación, alternativas, interrupciones, aplazamientos y planes por autorizar). En el celular el menú se pliega tras un botón «Menú». El sidebar abre el grupo de la página actual y los que tienen pendientes; el usuario puede abrir o cerrar los demás mientras dure la visita (no se guarda en el navegador). Cada opción lleva su ícono, el resumen como `title` y, cuando está activa, ese mismo resumen impreso debajo.
- **Guía de ayuda por rol** (`src/lib/ayuda.ts`, `/formulario/ayuda`): qué hace el rol y para qué sirve cada opción de su menú. Es contenido, no lógica; el administrador ve lo mismo que Coordinación más «Coordinadores». En el mismo archivo van `ayudaMenu` (ícono + una línea por cada `href` del menú, la que se ve en los tooltips y bajo la opción activa) y `bienvenidaRol` (la frase del saludo). **Si se agrega una opción al menú, se describe en los tres lugares.**
- **Saludo de bienvenida** (`src/components/bienvenida-splash.tsx`, montado en `formulario/layout.tsx`): tarjeta que dice para qué sirve el SEPA y qué hace ese rol. Sale una vez por sesión del navegador (`sessionStorage`), se cierra sola a los 5 s, con Escape o con un clic, y nunca bloquea: si el almacenamiento falla, en el peor caso se vuelve a ver.
- **Pantalla de entrada** (`src/app/login/page.tsx`): a la izquierda el objetivo de la aplicación sobre el degradado institucional, a la derecha el formulario. En móvil solo queda el formulario con la marca arriba.
- **Animaciones** en `globals.css` (`sepa-aparece`, `sepa-sube`, `sepa-progreso`), todas anuladas bajo `prefers-reduced-motion`.

## Reglas de negocio — son decisiones institucionales, no cambiarlas sin consultar

**Estados del aprendiz** (`EstadoAprendiz`):
- `ACTIVO` → `POR_CERTIFICAR` → `CERTIFICADO`. Lo marca Por certificar el instructor, solo con las seis evidencias completas, y eso envía el correo con los requisitos. El paso a Certificado es **manual** (Coordinación), porque la certificación de estudio se expide fuera del sistema.
- Pausas: `PRACTICA_INTERRUMPIDA` y `APLAZADA`. Cierre por abandono: `DESERTADO`. En los tres el reloj de plazos está detenido: no se cuentan atrasos.

**Evidencias y evaluaciones:**
- Se evalúa con la **rúbrica de GFPI-F-023** (variables *Satisfactorio / Por mejorar* y juicio *Aprobado / No aprobado* en el Momento 3). La convención A/D/P de los requisitos originales **no se usa**; el enum `Calificacion` quedó sin uso.
- Una evidencia está completa **cuando está avalada**. Haberla hecho tarde no la deja "atrasada" para siempre.
- Plazos: Concertación, 15 días desde el inicio; Momento 2, al **50 % del plan**; Momento 3, 10 días antes del cierre; certificación del empresario, hasta el fin de la EP.
- **Bitácoras: siempre 6**, una por cada mes de los seis de práctica (decisión de Coordinación, 29 sep 2026). La opción de 12 cada 15 días **se eliminó**: no se elige en ninguna pantalla, `totalBitacoras` vale 6 por defecto y los 24 aprendices que estaban en 12 se pasaron a 6 con la migración `20260929120000_seis_bitacoras`. Las bitácoras ya entregadas por encima de la sexta no se borran: siguen en el expediente como constancia (hoy, una de Jaider Enrique Coba Villanueva).
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
- **Plan de mejoramiento** (§9.4 y reglamento del aprendiz, **Acuerdo 009 de 2024**; `src/lib/plan-mejoramiento.ts`, `/formulario/instructor/planes` y `/formulario/coordinador/planes`): medida formativa académica cuando el aprendiz no supera resultados de aprendizaje en **cualquiera de los tres Momentos**, agotados los dos llamados de atención previos (SEPA **no** lleva esos llamados: el instructor deja constancia escrita de ellos en el plan).
  - Lo **elabora el instructor** con lo que exige el reglamento: resultados no superados, actividades de aprendizaje, evidencias de conocimiento/desempeño/producto, y el plazo en días.
  - Lo **autoriza el coordinador académico**, y esa autorización es la *suscripción*: recién ahí se fija la fecha límite y sale la **comunicación escrita** al aprendiz (correo con copia al instructor). Coordinación puede devolverlo con su observación, y el instructor lo corrige y lo reenvía. **No requiere acta** del Comité — a diferencia del aplazamiento.
  - **Plazo:** los días calendario que ponga el instructor, máximo **20**, contados desde la autorización, y nunca más allá del fin de la etapa productiva (si cae después, se recorta hasta ese día).
  - Lo **verifica el instructor** y lo cierra como *Cumplido* o *No cumplido*, siempre con constancia escrita; puede adjuntar el escrito firmado.
  - **Solo advierte:** un plan sin cerrar, vencido o no cumplido no bloquea «Por certificar» ni es causal de deserción — la respuesta trae `advertencias` y el panel de Seguimiento las muestra. Cabe un **segundo plan** a criterio del instructor, una vez cerrado el anterior (solo uno abierto a la vez por aprendiz).
  - **No hay formato oficial:** es un escrito firmado por el aprendiz y el coordinador académico, así que SEPA guarda su contenido y el archivo firmado como soporte.

**Formato GFPI-F-023 por momento** (`src/lib/formato-gfpi023.ts`, `src/components/formato-ep.tsx`, `/api/etapa-productiva/formato`):
- En cada uno de los tres Momentos el aprendiz **diligencia el formato, lo revisa en una vista previa y lo envía** junto con el PDF firmado, igual que en Alternativa EP y Formalización (`ConcertacionFuncion.archivoUrl`, `Evaluacion.archivoUrl`).
- **El formato llega pre-diligenciado** con lo que SEPA ya guarda: ficha (programa, grupo, nivel, modalidad, jornada, fin de la etapa lectiva), datos del aprendiz, instructor de seguimiento, empresa y coformador, fechas de la EP, y los datos propios del momento.
- **Nunca se inventa un dato.** Lo que el sistema no sabe sale en blanco y la previa lo lista como pendiente. **Regional, Centro de formación y Estrategia formativa** son parámetros del centro: los fija Coordinación una sola vez en «Datos del centro» (`ConfiguracionCentro`, fila única `centro`, `/formulario/coordinador/configuracion`) y entran solos en los tres momentos de todos los aprendices, para que ninguno los teclee mal. Solo el correo institucional, el NIT de la empresa y los datos de asistencia por discapacidad los escribe el aprendiz, una vez, en `DatosFormatoEP`.
- **Momento 1:** el aprendiz **propone** el plan de trabajo y completa ARL, póliza y horario; el instructor lo ajusta con él al valorar. **Competencias y resultados de aprendizaje se eligen de listas desplegables** con el catálogo del programa de su ficha (filas «competencia → resultado», `SelectorPlan` en `formato-ep.tsx`; decisión del 2 oct 2026) y se guardan uno por línea, el mismo formato que usa el instructor, así que al revisar le aparecen marcados. Lo leído del PDF se **casa con el catálogo** por el texto de los resultados (`filasDesdeDocumento` en `src/lib/competencia-catalogo.ts`) —en el GFPI-F-023 de Blanca, sus 6 resultados y 3 competencias—, y lo que no coincide se muestra como aviso y no se guarda. **Nunca se escriben a mano** (decisión de Coordinación, 2 oct 2026): solo existen las competencias y resultados que Coordinación de Etapa Productiva cargó al catálogo; el aprendiz y el instructor únicamente eligen. Si el programa no tiene catálogo se muestra un aviso para que Coordinación lo cargue (el resto del formato se puede guardar). El servidor lo hace cumplir con `src/lib/competencias-validas.ts` (`problemaEnPlan`, `problemaEnCompetencia`) en el formato del aprendiz, la concertación del instructor y las actividades de bitácora (cuya competencia leída del PDF pasa por `competenciaDelCatalogo`); lo guardado antes de la regla se conserva y solo lo nuevo debe venir del catálogo. **El catálogo no admite duplicados** (3 oct 2026): `src/lib/competencias-duplicados.ts` (`claveResultado` quita numeración «1.», «RA1», «RAP 1.», «01-», «RA 1:» y horas «3C/144H»; `duplicadoEn`) se aplica en la importación —contra el catálogo y dentro de lo pegado—, el alta y la edición; reimportar la misma fila exacta sigue actualizándola. Al 3 oct 2026 el catálogo (635 filas, 11 programas) no tiene duplicados. Actividades, evidencias y observaciones siguen siendo texto. **Momentos 2 y 3:** el aprendiz escribe sus observaciones/retroalimentación; las **13 variables** (8 Factores Técnicos + 5 Actitudinales) las valora **solo el instructor**, y en el Momento 3 también registra el número de visitas.
- **Si el PDF no se puede leer** (una foto o un escaneo; 4 oct 2026), los datos se escriben **a mano en la misma vista previa del formato**: las casillas que el sistema no trae y le tocan al aprendiz —correo institucional, enlace de grabación, modalidad del Momento 2/3 y el día de la reunión cuando el momento no lo tiene— aparecen como campos resaltados dentro de la previa, y también en el bloque «Datos de la reunión» del formulario. El aviso de campos en blanco dice cuántos se pueden escribir ahí mismo. En el servidor, lo escrito manda sobre lo leído del PDF; la modalidad leída del PDF solo entra si el momento no la tiene, y el día solo se fija si el momento no tiene ninguno (nunca futuro). Coordinación decidió **no** leer fotos con OCR ni IA por ahora (4 oct 2026): con PDF la lectura funciona bien, y una **foto** (JPG/PNG/WEBP) se reconoce como tal antes de intentar abrirla (`esPdf` en `src/lib/leer-pdf.ts`, en los lectores del GFPI-F-023 y del GFPI-F-147 y al enviar): la pantalla dice que es una foto, abre y resalta en ámbar los bloques donde escribir a mano, y la foto se envía igual como soporte.
- **La lectura ocurre al adjuntar el archivo**, no al enviar (`POST /api/etapa-productiva/formato/leer`, que lee y devuelve sin guardar): lo leído entra de una vez en los campos vacíos del formulario y se ve marcado en la vista previa, que es donde el aprendiz lo revisa. Al enviar se vuelve a leer en el servidor para dejarlo guardado.
- **Al adjuntar el formato firmado, SEPA lo lee** (`src/lib/leer-gfpi023.ts`, con `pdfjs-dist`) y completa con él lo que le falte: modalidad de formación, tipo de documento, correo institucional, fecha de SofiaPlus, NIT, ARL y póliza, horario, el plan de trabajo y el enlace de grabación. El orden manda siempre: **lo que el sistema ya sabe > lo que escribió el aprendiz > lo leído del PDF**, y lo leído se marca en la vista previa como «leído del PDF» para que lo verifique. Un PDF escaneado (una foto) no tiene texto: ahí no se lee nada y la pantalla lo dice. Los datos de la empresa y del coformador **no** se leen del PDF a propósito: el sistema ya los tiene y en el documento salen mezclados con el texto de la tabla. `pdfjs-dist` va en `serverExternalPackages` (next.config.ts) porque su worker no se puede empaquetar.
- **El formato aparece en los tres momentos, estén agendados o no.** Si el momento se hizo por fuera de SEPA —lo normal en los aprendices que venían antes de la plataforma—, el aprendiz escribe el día y la franja en que ocurrió y el momento queda registrado con su formato. Solo se acepta una **fecha pasada**: una reunión futura se agenda por el camino normal, que es el que manda la citación. El momento así creado nace `PENDIENTE`, sin enlace de videollamada, y lo avala el instructor como cualquier otro.
- Enviar **no dispara correos**: el formato y su adjunto quedan como evidencia del momento para que el instructor los revise (decisión de Coordinación, 28 sep 2026). Una vez avalado el momento, el formato ya no se reescribe.

**Bitácora GFPI-F-147 leída del adjunto** (`src/lib/leer-gfpi147.ts`, `POST /api/etapa-productiva/bitacoras/leer`): al adjuntar la bitácora firmada, SEPA la lee y diligencia lo que esté vacío —número, período a reportar, correo institucional, modalidad de ejecución, la afiliación a la ARL con su nivel, y la tabla de actividades—. No guarda nada: eso pasa al enviar. **Ojo con el formato:** la bitácora es una hoja de cálculo, y al exportarla a PDF las etiquetas salen en bloque y los valores después, así que no se puede recorrer «etiqueta → valor» como en el GFPI-F-023; se acota cada sección y se reconoce el dato por su forma. Lo que venga partido en el archivo (se han visto fechas como «26/72026») se deja vacío en vez de guardarse a medias. Las utilidades comunes a los dos lectores están en `src/lib/leer-pdf.ts`.

**Empresas co-formadoras** (decisiones de Coordinación, 2 oct 2026; `src/lib/empresas.ts`, `src/lib/nit.ts`, `src/lib/rues.ts`, `src/lib/colombia.ts`, `/formulario/admin/empresas`):
- **Catálogo único, solo del administrador.** Una empresa = un NIT; varios aprendices pueden estar en la misma. El aprendiz elige la suya **por NIT** en «Mi perfil» y ve nombre, dirección y ubicación del catálogo, sin poder cambiarlos. **Si el NIT no está registrado, no puede guardar su perfil de empresa** hasta que el administrador la registre (los perfiles ya guardados siguen funcionando; el bloqueo es al guardar).
- **NIT con dígito de verificación comprobado** (algoritmo de la DIAN): se acepta «811045607-6», «811.045.607-6» o «8110456076», y se guarda siempre «811045607-6». Si falta el DV, el mensaje muestra cómo quedaría completo.
- **RUES** (Registro Único Empresarial y Social, Confecámaras, en Datos Abiertos: conjunto `c82u-588k`): al registrar, el NIT se consulta para tomar la **razón social oficial** y ver el estado de la matrícula. Se piden solo campos de la empresa (`$select`): el registro trae también al representante legal, y esos datos personales **nunca se consultan ni se guardan**. El RUES **no bloquea**: si no responde o el NIT no figura (entidades públicas como EPM no están), se avisa y se registra a mano.
- **Departamento y municipio solo desde listas desplegables**, con la división oficial del DANE: los 33 departamentos y 1.122 municipios con su código DIVIPOLA (`src/lib/colombia-municipios.ts`, **generado** desde el conjunto `pqwj-3fi4` de datos.gov.co —no se edita a mano—). El municipio debe ser del departamento elegido.
- **Importación desde hoja de cálculo**: el administrador pega las filas NIT · NOMBRE · DIRECCIÓN · DEPARTAMENTO · MUNICIPIO (encabezado opcional; separadas por tabulador, punto y coma o coma). Primero se **revisan** todas —misma validación que el alta, más el RUES en una sola consulta— y se ve fila por fila qué pasaría (nueva, ya estaba, repetida, con error, y avisos del RUES); después se confirma y solo se crean las nuevas y válidas.
- **Enlazar lo que había**: los perfiles escritos a mano antes del catálogo aparecen agrupados por nombre (sin mayúsculas ni tildes); el administrador registra la empresa y los enlaza todos de una vez, sin pedirle el NIT a cada aprendiz.
- **El NIT va en los informes** de instructor, Coordinación y Admin (listado de Reportes, en pantalla y Excel) y en el expediente que ven ellos; **no** en la vista del propio aprendiz.

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

**Resumen semanal para Coordinación** (decisión del 4 oct 2026; `src/lib/resumen-semanal.ts`, redacción pura en `src/lib/resumen-semanal-correo.ts`): cada **lunes**, en la misma tarea diaria, cada coordinador recibe un correo con lo que espera su acción —alternativas por avalar (y cuántas pasan de los 8 días hábiles), interrupciones, aplazamientos, planes por autorizar, aprendices por certificar— y la lista de aprendices en riesgo (los mismos de Reportes › Cumplimiento). Uno por coordinador y semana: queda en `AvisoPlazo` con tipo `RESUMEN_SEMANAL`, `fechaLimite` = el lunes. Mismos interruptores que los avisos; `?resumen=1` lo muestra cualquier día, siempre como simulación. La clave de la tarea programada se compara en tiempo constante.

**Expediente del aprendiz** (requisitos §3.4, guía §9.5; `src/lib/expediente.ts` y `src/components/expediente-aprendiz.tsx`):
- Todo el proceso de un aprendiz en una sola vista de solo lectura: datos y empresa, el semáforo de las seis evidencias (el mismo `calcularSeguimiento`), cada evidencia con quién la revisó y cuándo, la rúbrica de cada Momento, las reuniones extraordinarias, las novedades y los avisos enviados por correo.
- La ven el instructor (de cualquier aprendiz, como su lista de Aprendices), Coordinación y Admin en `/formulario/expediente/[id]`, y el aprendiz el suyo en la pestaña «Expediente».
- Se descarga con «Imprimir o guardar en PDF» del navegador, sin librería de PDF: al imprimir se ocultan el encabezado y los menús (`print:hidden`), y el modo oscuro solo aplica en pantalla (`@custom-variant dark` en `globals.css`), así que el PDF sale en claro.

**Reportes** (requisitos §3.5; `src/lib/reportes.ts`, `/formulario/reportes` y `/api/reportes/excel`):
- Tres reportes que se reparten la información para no repetirla: **Métricas** (solo totales: aprendices por estado, bitácoras a tiempo y aprobadas, rúbrica en «Satisfactorio», juicio final), **Cumplimiento** (cada evidencia en conjunto y la lista de aprendices en riesgo: evidencias atrasadas o causal de deserción) y **Listado** (una fila por aprendiz con su avance).
- Una sola consulta (`construirReporte`) alimenta la pantalla y el Excel, con los mismos filtros: ficha, instructor, empresa, estado y rango de la fecha de inicio de la EP. Los filtros van en la URL (formulario GET).
- Solo consulta. Los ven el instructor —de todos los aprendices, no solo de sus fichas— y Coordinación y Admin.
- Excel real (`.xlsx`, librería `write-excel-file`, solo en el servidor) con una hoja por reporte; el PDF sale de «Imprimir o guardar en PDF», igual que el expediente.
- Métricas incluye también las **novedades** (§9.2): cuántas se registraron, qué porcentaje dentro de los 3 días hábiles y cuántas siguen sin anotar en bitácora; los **planes de mejoramiento** (§9.4): cuántos hay, cuántos siguen sin cerrar, cuántos con el plazo vencido y cuántos no cumplidos; más dos alertas institucionales: aprendices fuera del plazo de 24 meses e instructores por encima del tope de 80 (esta última sobre todo el centro, no sobre el filtro). El listado trae por aprendiz sus novedades, las que quedaron fuera de plazo, sus planes de mejoramiento y la alerta de plazo.
- **Consolidado por ficha y por programa** dentro de la misma pantalla y del mismo Excel (hojas «Por ficha» y «Por programa»): aprendices, cuántos con atrasos, por certificar, certificados, bitácoras aprobadas sobre previstas, porcentaje de rúbrica en «Satisfactorio», juicio del Momento 3, novedades (y las que quedaron fuera de plazo) y planes de mejoramiento abiertos. Sale de la misma consulta y respeta los mismos filtros.
- **Informe «Funciones en la empresa»** (`/formulario/reportes/funciones`, solo Coordinación y Admin; lógica en `src/lib/informe-funciones.ts`, pedido el 4 oct 2026): las funciones **asignadas** (plan del Momento 1) y **realizadas** (actividades de bitácora), partidas por renglón/viñeta/oración, por ficha y por programa; las más comunes y las palabras que más se repiten; la comparación con las **competencias técnicas** del programa (las básicas y clave son transversales y no se comparan, tampoco la fila genérica 999999999) por palabras clave ponderadas; y recomendaciones con las funciones que ninguna competencia contempla y las competencias sin práctica. Clasificación: «coincide» (por contenido), «solo la eligió el aprendiz», «no contemplada». No usa IA ni inventa: todo sale del texto registrado y del catálogo. Con pocos datos lo dice («conclusiones preliminares»).
- **Reportes:** indicadores principales arriba (aprendices, % al día, en riesgo, certificados), aprendices por estado en barras, y cumplimiento por evidencia en barras apiladas con los colores de estado (completa / próxima / atrasada / pendiente, siempre con ícono y etiqueta); navegación por secciones.
- El menú lateral va **agrupado por tarea** (`roleNav` en `src/components/panel-sidebar.tsx`): Seguimiento / Evidencias por revisar / Reuniones y novedades / Consultas / Cuenta en el instructor, y Estructura / Aprendices / Novedades / Consultas / Cuenta en Coordinación y Admin.

**Cuentas — riesgo aceptado:** las cuentas que crea otro rol reciben como contraseña inicial su cédula, que es también el usuario, y el correo de bienvenida la envía en texto plano. Coordinación ratificó las dos decisiones el 14 de septiembre de 2026, sabiendo que 23 de 37 cuentas (incluidos los 2 coordinadores) seguían con la cédula como contraseña. No cambiarlo ni volver a proponerlo sin que Coordinación lo pida.

## Roadmap

El detalle está en `docs/PLAN-IMPLEMENTACION.md`. De la guía GFPI-G-040 no queda nada pendiente: el plan de mejoramiento (§9.4) se construyó el 28 de septiembre de 2026 con las reglas del Acuerdo 009.

Trabajar un frente a la vez, y aplicar y probar cada migración antes de construir la interfaz encima.
