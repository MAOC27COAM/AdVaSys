# Tabla 7. Documentacion del flujo de eventos — Administrador

**Caso de Uso del Sistema:** Administrador  
**Actor principal:** Administrador (interno)  
**Sistema:** Intranet academica ADUNI Vallejo  

---

## Escenario 1 — Autenticacion y contexto de ciclo activo

| Campo | Detalle |
|-------|---------|
| **Descripcion** | El administrador accede al sistema, obtiene sesion autenticada y establece el ciclo academico sobre el cual operara. |
| **Precondicion** | Existe cuenta de usuario con rol `admin` y estado `ACTIVE`. |
| **Flujo normal** | 1. Ingresa credenciales en `/login`. 2. Sistema valida usuario y emite token JWT (`POST /api/auth/login`). 3. Sistema redirige a `/dashboard/matricula`. 4. Modulo Matricula carga ciclos (`GET /api/cycles`). 5. Sistema selecciona automaticamente el ultimo ciclo operable (`startDate <= hoy <= endDate`). 6. Se establece `activeCycleId` en contexto del dashboard. 7. Modulos dependientes (pagos, asistencia, simulacros, usuarios) quedan habilitados. |
| **Flujo alterno 1** | Credenciales invalidas: sistema muestra error y no emite token. |
| **Flujo alterno 2** | Usuario con `mustChangePassword`: solo permite cambio de contrasena hasta completarlo. |
| **Flujo alterno 3** | Sin ciclos registrados: sistema muestra mensaje y ofrece crear ciclo (CIC-CU01). |
| **Postcondicion** | Sesion activa con ciclo seleccionado en memoria de sesion frontend. |

---

## Escenario 2 — Matricular estudiante nuevo

| Campo | Detalle |
|-------|---------|
| **Descripcion** | Registra un estudiante inexistente y lo matricula en el ciclo activo con acuerdo de pago. |
| **Precondicion** | Ciclo activo en periodo operable. DNI no registrado en el sistema. |
| **Flujo normal** | 1. Accede a Matricula con ciclo seleccionado. 2. Selecciona "Matricular nuevo estudiante". 3. Completa datos personales, academicos (modalidad, grupo, turno), apoderado y pago inicial. 4. Sistema valida DNI (8 digitos, unico), email y campos obligatorios. 5. Envio `POST /api/students/enrollment`. 6. Backend crea `User`, `StudentProfile`, `CycleEnrollment`, acuerdo de pago y cuotas. 7. Sistema muestra confirmacion y actualiza tabla de matriculados. |
| **Flujo alterno 1** | DNI ya existe: sistema sugiere flujo de estudiante recurrente (MAT-CU03). |
| **Flujo alterno 2** | Ciclo fuera de periodo: operacion bloqueada con mensaje. |
| **Flujo alterno 3** | Error de validacion: formulario resaltado sin persistir datos. |
| **Postcondicion** | Estudiante matriculado en ciclo activo con deuda/saldo inicial registrado. |

---

## Escenario 3 — Importacion masiva por Excel

| Campo | Detalle |
|-------|---------|
| **Descripcion** | Carga multiples matriculas desde archivo Excel con validacion previa. |
| **Precondicion** | Ciclo activo operable. Archivo con encabezados validos. |
| **Flujo normal** | 1. Abre modal "Importar Excel" en Matricula. 2. Selecciona archivo y envia `POST /api/students/bulk-enrollment/preview`. 3. Sistema clasifica filas: validas, errores, recurrentes, duplicadas. 4. Administrador revisa preview. 5. Confirma importacion `POST /api/students/bulk-enrollment/commit`. 6. Sistema crea matriculas y acuerdos de pago en lote. 7. Tabla de matriculados se refresca. |
| **Flujo alterno 1** | Encabezados invalidos: preview rechazado sin commit. |
| **Flujo alterno 2** | Ninguna fila valida: commit no disponible. |
| **Postcondicion** | Estudiantes importados correctamente; filas con error quedan reportadas sin importar. |

---

## Escenario 4 — Gestion de pagos del ciclo

| Campo | Detalle |
|-------|---------|
| **Descripcion** | Consulta indicadores financieros del ciclo, busca alumno y registra pagos o descuentos. |
| **Precondicion** | Ciclo activo seleccionado. Rol admin autenticado. |
| **Flujo normal — dashboard** | 1. Ingresa a Pagos (`/dashboard/pagos`). 2. Sistema carga KPIs (`GET /api/payments/cycle-summary`) e historial por dia (`GET /api/payments/cycle-history`). 3. Visualiza totales activos/retirados, montos pagados y pendientes. |
| **Flujo normal — detalle alumno** | 4. Busca estudiante por DNI (`GET /api/payments/search`). 5. Navega a detalle (`/dashboard/pagos/alumno/:documentId`). 6. Consulta resumen y historial (`student-summary`, `history`). 7. Registra pago (`POST /api/payments/register`) o cupon (`POST /api/payments/discount`). 8. Sistema actualiza saldo y historial. |
| **Flujo alterno 1** | Estudiante no encontrado: mensaje en buscador. |
| **Flujo alterno 2** | Retirar estudiante: `POST /api/payments/student/:id/retire` cambia estado a RETIRED. |
| **Flujo alterno 3** | Reactivar estudiante: `POST /api/payments/student/:id/activate`. |
| **Postcondicion** | Transaccion registrada; saldo del estudiante actualizado en ciclo activo. |

---

## Escenario 5 — Sesion de asistencia administrativa

| Campo | Detalle |
|-------|---------|
| **Descripcion** | Inicia sesion de asistencia, registra presentes/tardanzas por QR y cierra marcando faltas. |
| **Precondicion** | Ciclo activo. Estudiantes matriculados en ciclo. |
| **Flujo normal** | 1. Accede a Asistencia. 2. Inicia sesion (`POST /api/attendance/session/start`). 3. Carga lista de alumnos (`GET /api/attendance/student-list`). 4. Escanea QR o ingresa DNI (`POST /api/attendance/record`) — estado PRESENT. 5. Opcional: activa modo tardanza; nuevos registros quedan LATE. 6. Finaliza sesion (`PATCH /api/attendance/session/end/:id`). 7. Sistema marca no registrados como ABSENT. 8. Consulta historial de sesion (`GET /api/attendance/session/:id/details`). |
| **Flujo alterno 1** | DNI no matriculado en ciclo: registro rechazado. |
| **Flujo alterno 2** | Sesion en curso existente: continuar en lugar de crear nueva. |
| **Postcondicion** | Sesion cerrada con registros PRESENT, LATE y ABSENT persistidos. |

---

## Escenario 6 — Simulacro RAW (analizar y procesar)

| Campo | Detalle |
|-------|---------|
| **Descripcion** | Crea evento por ciclo, valida archivo de respuestas crudas y procesa resultados con calificacion automatica. |
| **Precondicion** | Ciclo activo. Evento creado con `totalQuestions`. Clave de respuestas definida. |
| **Flujo normal** | 1. Accede a Simulacros. 2. Crea evento vinculado al ciclo (`POST /api/simulations/events`). 3. Define clave de respuestas (`PUT /api/simulations/events/:id/answer-key`). 4. Selecciona evento y "Subir resultados". 5. Ingresa nombre de instancia y archivo Excel (DNI + respuestas). 6. Pulsa "Analizar archivo RAW": frontend parsea DNI y llama `POST /api/simulations/validate-codes` — **no crea instancia**. 7. Revisa tabla de estados (FOUND, NOT_FOUND, NOT_ENROLLED, INACTIVE). 8. Pulsa "Procesar y guardar": `POST /api/simulations/events/:id/instances/process-raw`. 9. Backend crea instancia, califica (+4/-1), calcula rankings global/modalidad/grupo. 10. Navega a visor de resultados. |
| **Flujo alterno 1** | Sin clave completa: boton procesar deshabilitado. |
| **Flujo alterno 2** | Error en procesamiento: rollback de instancia huérfana. |
| **Flujo alterno 3** | Exportar resultados: `GET .../results/export`. |
| **Postcondicion** | Instancia con resultados y rankings; historial actualizado (solo instancias con resultados). |

---

## Escenario 7 — Simulacro PROCESSED (importacion directa)

| Campo | Detalle |
|-------|---------|
| **Descripcion** | Importa Excel ya procesado (codigo, nombres, apellidos, puntaje) en una sola operacion. |
| **Precondicion** | Ciclo activo. Evento seleccionado. Archivo con columnas requeridas. |
| **Flujo normal** | 1. En pantalla de subida, selecciona archivo procesado. 2. Pulsa "Importar resultados procesados" (`POST .../instances/import-processed`). 3. Backend crea instancia, importa puntajes validos, omite duplicados/no matriculados. 4. Calcula rankings. 5. Redirige al dashboard del evento con mensaje de exito. 6. Historial muestra nueva instancia. |
| **Flujo alterno 1** | Ningun resultado valido: importacion falla y se elimina instancia. |
| **Flujo alterno 2** | Duplicados en archivo: reportados en resumen sin importar filas repetidas. |
| **Postcondicion** | Instancia PROCESSED con resultados y resumen de importacion. |

---

## Escenario 8 — Eliminar evento o instancia de simulacro

| Campo | Detalle |
|-------|---------|
| **Descripcion** | Elimina evento completo o una instancia de resultados (accion exclusiva administrador en UI). |
| **Precondicion** | Evento o instancia existente. Confirmacion del usuario. |
| **Flujo normal — instancia** | 1. En historial de archivos, pulsa eliminar instancia. 2. Confirma dialogo. 3. `DELETE /api/simulations/instances/:id`. 4. Instancia y resultados eliminados. |
| **Flujo normal — evento** | 1. En lista de eventos, pulsa eliminar evento. 2. Confirma (incluye instancias asociadas). 3. `DELETE /api/simulations/events/:id`. |
| **Flujo alterno 1** | Cancela confirmacion: sin cambios. |
| **Postcondicion** | Registro eliminado en cascada segun reglas de BD. |

---

## Escenario 9 — Gestion de material de cursos

| Campo | Detalle |
|-------|---------|
| **Descripcion** | Administra el catalogo de cursos y los archivos de clase asociados (crear, editar, eliminar curso; subir y eliminar material). |
| **Precondicion** | Sesion autenticada con rol `admin` y estado `ACTIVE`. No requiere ciclo activo (`activeCycleId`). |
| **Flujo normal — catalogo** | 1. Accede a Material de Cursos (`/dashboard/cursos`). 2. Sistema carga catalogo (`GET /api/courses`). 3. Visualiza tarjetas de cursos disponibles. |
| **Flujo normal — curso** | 4. Pulsa "+ Crear Curso" y completa titulo, codigo, descripcion, modalidades y opcionalmente imagen de portada (max. 4 MB). 5. Sistema valida titulo obligatorio y al menos una modalidad. 6. Envio `POST /api/courses`. 7. Alternativamente: edita curso existente (`PATCH /api/courses/:id`) o elimina con confirmacion (`DELETE /api/courses/:id`). |
| **Flujo normal — materiales** | 8. Selecciona curso y entra al detalle (`GET /api/courses/:id`, `GET /api/courses/:courseId/materials`). 9. Pulsa "+ Subir Archivo", selecciona archivo (PDF, Office, imagenes o txt; max. 20 MB) y descripcion opcional. 10. Envio multipart `POST /api/courses/:courseId/materials`. 11. Lista de materiales se refresca. 12. Puede previsualizar (`GET /api/materials/:fileId/access-url?mode=preview`) o eliminar material (`DELETE /api/materials/:fileId`). |
| **Flujo alterno 1** | Validacion de formulario: titulo vacio o sin modalidades; formulario resaltado sin persistir. |
| **Flujo alterno 2** | Archivo invalido (tamano o tipo no permitido): mensaje de error en zona de subida. |
| **Flujo alterno 3** | Cancela confirmacion de eliminacion de curso o material: sin cambios. |
| **Flujo alterno 4** | Catalogo vacio: mensaje informativo y opcion crear primer curso. |
| **Postcondicion** | Curso y/o materiales persistidos en BD y almacenamiento de archivos. Estudiantes con modalidad compatible pueden consultar y descargar (Tabla 9, escenario 2). |
| **Casos de uso relacionados** | MATL-CU01 (crear curso), MATL-CU02 (editar curso), MATL-CU03 (eliminar curso), MATL-CU04 (subir material), MATL-CU06 (eliminar material), MATL-CU07 (consultar catalogo — staff ve todos los cursos). Nota: `PATCH /api/materials/:fileId` (MATL-CU05) existe en API pero no tiene flujo dedicado en la UI actual. |

---

*Fuente: elaboracion propia (sistema ADUNI Vallejo, 2026).*
