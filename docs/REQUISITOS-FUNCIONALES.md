# Documento de Requisitos Funcionales
## Sistema de Gestión de Etapa Productiva — "registro-empresa"

**Fecha:** 16 de agosto de 2026
**Estado:** Validado — todos los puntos pendientes fueron confirmados
**Actualizado:** 14 de septiembre de 2026 — ajustes confirmados por Coordinación y adaptación a la guía GFPI-G-040 v02 (ver sección 7). Donde un punto quedó reemplazado se conserva el texto original y se marca con una nota de actualización.

---

## 1. Descripción general

Aplicación web para gestionar la **Etapa Productiva** (práctica empresarial de 6 meses) de los aprendices que ingresan a empresas. Cubre desde la inscripción del aprendiz hasta el cierre de su proceso, incluyendo seguimiento por videoconferencia, entrega de evidencias institucionales, evaluación periódica y reportería con métricas.

## 2. Roles de usuario

| Rol | Descripción |
|---|---|
| **Aprendiz** | Se inscribe, agenda reuniones, sube evidencias, consulta su propio estado. |
| **Instructor / Tutor** | Puede **consultar** (solo lectura) los aprendices de cualquier ficha, pero solo puede **evaluar y hacer seguimiento/monitoreo de evaluación** sobre los aprendices que tiene asignados por ficha. Agenda y atiende reuniones, revisa y califica evidencias, registra evaluaciones — todo esto limitado a sus aprendices asignados. |
| **Coordinador / Administrador** | Gestiona usuarios, empresas y fichas; supervisa el proceso global; accede a consultas y reportes con métricas agregadas. |

> Confirmado: todos los instructores pueden ver aprendices de otras fichas solo para efectos de consulta, pero la evaluación y el monitoreo de evaluación quedan restringidos a los aprendices asignados a su(s) propia(s) ficha(s).
>
> **Confirmado:** el "coformador" (tutor asignado por la empresa) no tiene un rol de usuario en el sistema — no valida evidencias dentro de la plataforma. Su participación se limita a asistir a reuniones y firmar formatos institucionales fuera del sistema (ver detalle en la sección 3.2).

## 3. Módulos funcionales

### 3.1 Inscripción del aprendiz
- Registro de datos del aprendiz (nombre, documento, programa de formación, ficha, correo, teléfono).
- Registro/selección de la empresa donde realizará la Etapa Productiva (razón social, NIT, representante, contacto).
- Registro de fecha de inicio de la Etapa Productiva → esta fecha es la que dispara todos los plazos posteriores (concertación, bitácoras, evaluaciones).
- Asignación de instructor/tutor responsable.

### 3.2 Reuniones por videoconferencia
- El aprendiz (o el instructor) reserva una reunión de seguimiento.
- La reunión genera automáticamente un enlace de **Google Meet**.
- Se programa en **Google Calendar** para ambas partes (aprendiz e instructor).
- Se envía **notificación por correo electrónico** a los participantes al agendar y como recordatorio previo.
- **Cancelación / reprogramación:** puede realizarla el instructor o el aprendiz (el aprendiz debe acordarlo previamente con el coformador). Al cambiar la reunión, se notifica el cambio a todas las partes.
- Historial de reuniones por aprendiz (fecha, asistentes, estado: programada / realizada / cancelada).

**Cadencia oficial de reuniones (confirmada) — 3 en total durante los 6 meses:**
1. **Concertación de funciones** con el coformador (reunión inicial, ligada a la evidencia de concertación).
2. Una reunión adicional a los 2 meses de cadencia.
3. Una reunión de cierre, programada faltando **10 a 15 días** para terminar la Etapa Productiva.

Adicionalmente, se puede solicitar una **reunión extra** cuando haya algún problema/eventualidad, a petición del coformador o del aprendiz.

> **Confirmado:** el "coformador" (tutor asignado por la empresa) **no tiene acceso/login al sistema por ahora**. Su participación se limita a: (1) asistir a las reuniones de seguimiento, y (2) firmar los formatos institucionales fuera de la plataforma — bitácoras (cada 15 días durante los 6 meses) y las 3 evaluaciones (concertación + dos evaluaciones de seguimiento). No es un rol de usuario del sistema; se modelará como dato de contacto asociado a la empresa/aprendiz, no como cuenta.

### 3.3 Gestión de evidencias
Cada evidencia es un formato institucional que el aprendiz diligencia y sube como archivo, y que el instructor revisa (aprueba / rechaza con observaciones).

| Tipo de evidencia | Frecuencia / plazo | Cantidad total en 6 meses |
|---|---|---|
| **Bitácora** | Cada 15 días si son 12; una por mes si son 6 | 6 o 12 |
| **Evaluación 1 — Concertación** | 15 días después de iniciar la Etapa Productiva (ligada a la primera reunión oficial) | 1 |
| **Evaluación 2 — Seguimiento** | ~2 meses de cadencia | 1 |
| **Evaluación 3 — Seguimiento (cierre)** | Faltando 10-15 días para terminar la Etapa Productiva | 1 |
| **Certificación del empresario** | Al finalizar la Etapa Productiva (evidencia de cierre) | 1 |

> **Actualización (13 sep 2026) — bitácoras:** el total por aprendiz puede ser **6 o 12**. Con 12 se entregan cada 15 días; con 6, una por mes hasta cumplir el período de práctica. La evidencia se da por **cumplida con 6 bitácoras aprobadas**, aunque se hayan planeado 12.
>
> **Actualización (13 sep 2026) — Evaluación 2:** se ubica al **50 % del tiempo planeado** (guía GFPI-G-040 §9.2), no a los 2 meses fijos. Coinciden en una práctica de 6 meses, pero no cuando el tramo es más corto (por ejemplo, al retomar tras una interrupción).

> **Confirmado:** la Concertación **es la primera de las 3 evaluaciones** (no una evidencia independiente). Total de evaluaciones: 3 (Concertación + 2 de seguimiento), coherente con las 3 reuniones oficiales de la sección 3.2.
>
> **Confirmado — evidencia de cierre:** la última evidencia del proceso es la **Certificación del empresario**: una carta de terminación del contrato de aprendizaje, a satisfacción de la empresa, que cierra formalmente la Etapa Productiva del aprendiz.

Reglas de negocio necesarias:
- Cálculo automático de fechas límite a partir de la fecha de inicio de la Etapa Productiva.
- Estado de cada evidencia: *pendiente*, *subida a tiempo*, *subida con atraso*, *aprobada*, *rechazada — requiere corrección*.
- Alertas/notificaciones al aprendiz cuando se acerca o vence una fecha límite.
- El instructor puede aprobar, rechazar o solicitar corrección de una evidencia, con comentarios.
- **Incumplimiento de plazo (confirmado):** si el aprendiz no sube una bitácora o evaluación a tiempo, el sistema debe **alertar el incumplimiento** y **notificar por correo al aprendiz y al coformador**. Se debe llevar un **registro histórico por aprendiz** de cada bitácora y evaluación (cumplida, atrasada, incumplida).

> **Confirmado:** sí, existen formatos institucionales oficiales para diligenciar bitácoras y evaluaciones:
> - **Evaluaciones (las 3, mismo formato):** `GFPI-F-023_V06` — Formato de Planeación, Seguimiento y Evaluación de Etapa Productiva.
> - **Bitácoras:** `GFPI-F-147` — Formato Bitácora Seguimiento Etapa Productiva, Vr 5.
>
> Ambos formatos deben estar disponibles como plantilla descargable dentro del sistema. Además, el sistema debe soportar **ambas opciones de flujo**: (1) descargar la plantilla, diligenciarla/firmarla fuera del sistema y subirla como archivo; o (2) diligenciar y **cargar las firmas directamente en el aplicativo**, generando el documento final descargable desde ahí.

### 3.4 Control de evaluaciones por aprendiz
- Vista consolidada de las 3 evaluaciones de cada aprendiz: fecha realizada, calificación/resultado, observaciones del instructor.
- **Control de la Certificación del empresario** (carta de terminación del contrato de aprendizaje a satisfacción de la empresa, sección 3.3): es un requisito **necesario para poder emitir la evaluación final**, por lo que debe verse reflejado en esta misma vista de control.
- Estado general del aprendiz respecto a su plan de evaluación (al día / atrasado / completo).

> **Confirmado — convención de calificación de evaluaciones:**
> - **A** — Evaluación correcta (aprobada).
> - **D** — Evaluación con errores en el diligenciamiento o datos incorrectos en el formato; debe corregirse y subirse nuevamente.
> - **P** — Pendiente de subir la evidencia, por demora en el tiempo de entrega.
>
> **Actualización (ago-sep 2026) — reemplaza la convención A/D/P:** al revisar el formato real `GFPI-F-023_V06` se adoptó su rúbrica. Cada Momento se valora con variables *Satisfactorio / Por mejorar* (6 de planeación en el Momento 1 y 13 en los Momentos 2 y 3), y el Momento 3 lleva un juicio final *Aprobado / No aprobado*. Cada evidencia queda *Pendiente*, *Aprobada* o *Rechazada*, con observaciones del instructor. La condición de aprobación se conserva en espíritu: con las seis evidencias avaladas, el instructor marca al aprendiz **Por certificar** y el sistema le envía los requisitos de certificación.
>
> **Confirmado — condición de aprobación:** la Etapa Productiva del aprendiz se aprueba cuando **todas sus evidencias quedan en estado A**. Al cumplirse esta condición, el sistema debe **notificar al aprendiz** que ya puede empezar a diligenciar su **certificación de estudio**.
>
> **Confirmado:** la certificación de estudio **se emite externamente**, en otra instancia institucional (fuera del sistema). Una vez el aprendiz queda certificado, el **aprendiz o el instructor** debe ingresar manualmente al sistema y actualizar el estado del aprendiz a **"Certificado"**. Este estado marca el cierre definitivo del proceso en la aplicación.

### 3.5 Consultas y reportes
- Búsqueda y filtro de aprendices (por ficha, empresa, instructor, estado, rango de fechas).

> **Confirmado — estados del aprendiz para filtro:**
> - **Activo** — aún está en Etapa Productiva (en prácticas).
> - **Certificado** — ya se graduó (certificación de estudio emitida y registrada en el sistema).
>
> **Actualización (sep 2026) — estados completos:** Activo, Práctica interrumpida, Práctica aplazada, Por certificar, Certificado y Desertó. Ver sección 7.

- Reportes de cumplimiento: entregas a tiempo vs. atrasadas, evidencias pendientes, aprendices en riesgo (atrasos acumulados).
- Métricas agregadas: aprendices activos, aprendices certificados, tasa de cumplimiento de bitácoras, promedio de evaluaciones, próximas fechas límite.
- **Exportación de reportes (confirmado): ambos formatos, PDF y Excel.**

> **Confirmado — acceso a reportes:**
> - **Coordinador:** acceso de **solo consulta/visualización** a todos los informes (no edita desde ahí).
> - **Instructor:** puede ver los reportes de **todos los aprendices** (no limitado a los que tiene asignados por ficha) — coherente con su permiso de consulta general definido en la sección 2.
>
> **Actualización (15 sep 2026) — construido:** tres reportes que no repiten información —Métricas, Cumplimiento (con la lista de aprendices en riesgo) y Listado—, con los filtros de arriba y descarga en Excel (.xlsx) y PDF. Como la evaluación usa la rúbrica y no una nota, el «promedio de evaluaciones» se muestra como el porcentaje de variables valoradas en *Satisfactorio*, junto con el juicio final del Momento 3.

## 4. Integraciones externas requeridas

| Integración | Uso |
|---|---|
| Google Meet | Generación de enlaces de videoconferencia |
| Google Calendar | Programación de reuniones |
| Servicio de correo (SMTP / API tipo Resend, SendGrid) | Notificaciones de reuniones, recordatorios de plazos, resultados de evidencias |
| Almacenamiento de archivos | Subida de formatos diligenciados (PDF/Word/imagen) |

## 5. Entidades principales del modelo de datos (borrador)

- **Usuario** (rol: aprendiz / instructor / coordinador)
- **Aprendiz** (datos personales, ficha, programa, empresa, instructor asignado, fecha inicio Etapa Productiva, estado: Activo/Certificado)
- **Empresa** (razón social, NIT, contacto)
- **Reunión** (aprendiz, instructor, fecha/hora, enlace Meet, estado)
- **Evidencia** (aprendiz, tipo: bitácora/evaluación/certificación del empresario, número de secuencia si aplica, fecha límite, fecha de entrega, archivo, estado, observaciones)
- **Evaluación** (aprendiz, número 1-3 — donde la evaluación 1 es la Concertación —, fecha, resultado/calificación con convención A/D/P, observaciones)
- **Notificación** (destinatario, tipo, canal, fecha de envío)

## 6. Alcance fuera de esta primera versión (sugerido, a confirmar)

- Firma digital de formatos.
- App móvil nativa (se asume solo web responsiva).
- Integración con el sistema institucional (ej. SENA Sofia Plus) — **confirmado fuera de alcance por ahora**; se evaluará en una fase posterior.

## 7. Adaptación a la guía GFPI-G-040 v02 (12-14 sep 2026)

Confirmado con Coordinación a partir de la *Guía para el Desarrollo de la Etapa Productiva*:

- **Interrupción y retoma** (§7, §9.3.1): el aprendiz que no puede terminar con su alternativa (renuncia, liquidación de la empresa, salud, traslado, servicio militar…) reporta la interrupción con el certificado de práctica parcial. Coordinación la avala y confirma los días cumplidos, que se descuentan del tramo siguiente: al retomar con otra alternativa solo completa el tiempo que le falta. Máximo **3 cambios** de alternativa en todo el proceso.
- **Aplazamiento por novedad** (§9.3): maternidad, incapacidad, vacaciones colectivas, cese de actividad de la empresa o fuerza mayor suspenden la práctica sin terminarla. El aprendiz vuelve con la **misma** alternativa. Lo autoriza el **Comité de Evaluación y Seguimiento**; en el sistema lo registra Coordinación con el número y la fecha del acta, que son obligatorios.
- **Deserción** (§9.1.1): el sistema señala el riesgo cuando se cumple una causal (no presentar la planeación antes de la fecha fin de la ficha, o interrumpir sin conseguir alternativa nueva dentro de ese plazo). La **declara Coordinación**, con la causa por escrito; es reversible.
- **Requisitos para avalar** (§9.1.1): resultados de aprendizaje de la etapa lectiva al 100 %, ARL vigente al menos un día antes de iniciar y autorización de MinTrabajo (GFPI-F-203) si el aprendiz es menor de edad. **Advierten, no bloquean**: se puede avalar sin ellos, pero dejando constancia de la razón.
- **Plazos de la institución** (§9.1.2, §9.3.1): 8 días hábiles para avalar una alternativa, 15 para un cambio de alternativa y 8 para registrarla en SofiaPlus. Se muestran como antigüedad en cada pendiente.
- **SofiaPlus:** la integración sigue fuera de alcance (sección 6). Coordinación anota en SEPA la fecha en que registró la alternativa, como constancia.

- **Expediente del aprendiz** (§9.5, y la vista consolidada de la sección 3.4): todo el proceso en una vista de solo lectura, que se guarda en PDF desde el navegador. La ven el aprendiz (el suyo), el instructor y Coordinación.

- **Tope de 80 aprendices por instructor** (§9.1.3): **solo advierte**, al asignar fichas o aprendices y en el panel de Instructores.
- **Plazo de 24 meses** (§9.1.1 c, Acuerdo 007 de 2012): aplica a las fichas que Coordinación marca con ese reglamento, contado desde su «Inicio productiva». **Solo advierte**; no bloquea ni cuenta como deserción.
- **Plantillas oficiales** (sección 3.3): GFPI-F-147 V05 y GFPI-F-023 V06 descargables desde Bitácoras y Evaluaciones.

- **Registro de novedades** (§9.2): cualquier hecho que afecte el desarrollo de la práctica se registra con el día en que ocurrió. Lo hacen el aprendiz o su instructor. Plazos de **3 días hábiles** para registrarlo y **5** para dejarlo anotado en la bitácora: **solo advierten**.

**Pendiente de la guía:** el plan de mejoramiento cuando el juicio es No aprobado (§9.4), en pausa por decisión de Coordinación.

---

### Próximos pasos
1. Confirmar los puntos marcados como *pendiente de confirmar* arriba.
2. Revisar el proyecto ya iniciado (`registro-empresa`, Next.js + Prisma) para alinear este documento con lo ya construido.
3. Generar/actualizar `CLAUDE.md` con las convenciones técnicas del proyecto.
