# Tabla 8. Documentacion del flujo de eventos — Matriculador

**Caso de Uso del Sistema:** Matriculador  
**Actor principal:** Matriculador (interno)  
**Sistema:** Intranet academica ADUNI Vallejo  

> El matriculador comparte la operacion diaria con el administrador en matricula, pagos, asistencia, simulacros, usuarios, materiales y carnets. Comparte escenarios 1 a 7 y **9** (gestion de material) con el administrador. El escenario 8 del administrador (eliminar evento/instancia de simulacro) no aplica. Las diferencias respecto al administrador se indican al final de cada escenario cuando aplican.

---

## Escenario 1 — Autenticacion y contexto de ciclo activo

| Campo | Detalle |
|-------|---------|
| **Descripcion** | El matriculador accede al sistema y establece el ciclo academico de trabajo. |
| **Precondicion** | Cuenta con rol `matriculador` y estado `ACTIVE`. |
| **Flujo normal** | 1. Ingresa credenciales en `/login`. 2. Sistema emite JWT (`POST /api/auth/login`). 3. Redireccion a `/dashboard/matricula`. 4. Carga ciclos y selecciona ultimo ciclo operable. 5. `activeCycleId` queda disponible para modulos staff. |
| **Flujo alterno 1** | Credenciales invalidas: acceso denegado. |
| **Flujo alterno 2** | Sin ciclo activo: mensaje y opcion crear ciclo. |
| **Postcondicion** | Sesion activa con ciclo seleccionado. |

---

## Escenario 2 — Matricular estudiante nuevo

| Campo | Detalle |
|-------|---------|
| **Descripcion** | Registra estudiante nuevo en el ciclo activo. |
| **Precondicion** | Ciclo operable. DNI no existente. |
| **Flujo normal** | 1. Abre formulario de matricula. 2. Completa datos y pago inicial. 3. `POST /api/students/enrollment`. 4. Confirmacion y actualizacion de tabla. |
| **Flujo alterno 1** | DNI duplicado: flujo recurrente. |
| **Flujo alterno 2** | Ciclo cerrado: operacion bloqueada. |
| **Postcondicion** | Estudiante matriculado con acuerdo de pago. |

---

## Escenario 3 — Importacion masiva por Excel

| Campo | Detalle |
|-------|---------|
| **Descripcion** | Importa matriculas desde Excel con preview. |
| **Precondicion** | Ciclo operable. Archivo valido. |
| **Flujo normal** | 1. Sube Excel. 2. Preview (`bulk-enrollment/preview`). 3. Revisa filas. 4. Commit (`bulk-enrollment/commit`). 5. Lista actualizada. |
| **Flujo alterno 1** | Filas invalidas: no se importan. |
| **Postcondicion** | Matriculas validas creadas. |

---

## Escenario 4 — Gestion de pagos del ciclo

| Campo | Detalle |
|-------|---------|
| **Descripcion** | Consulta dashboard de pagos, busca alumno y registra transacciones. |
| **Precondicion** | Ciclo activo. |
| **Flujo normal** | 1. Pagos → dashboard KPIs e historial diario. 2. Busca por DNI. 3. Detalle alumno. 4. Registra pago o descuento. 5. Opcional: retirar/reactivar estudiante. |
| **Flujo alterno 1** | Alumno no encontrado. |
| **Postcondicion** | Saldo e historial actualizados. |

**Nota:** Mismos permisos de pagos que administrador en el sistema actual.

---

## Escenario 5 — Sesion de asistencia administrativa

| Campo | Detalle |
|-------|---------|
| **Descripcion** | Gestiona sesion de asistencia con QR y cierre automatico de faltas. |
| **Precondicion** | Ciclo activo. |
| **Flujo normal** | 1. Inicia sesion. 2. Registra presentes por QR. 3. Modo tardanza si aplica. 4. Finaliza sesion → faltas ABSENT. 5. Consulta historial. |
| **Flujo alterno 1** | Estudiante no matriculado: rechazo. |
| **Postcondicion** | Sesion cerrada con registros completos. |

---

## Escenario 6 — Simulacro RAW (analizar y procesar)

| Campo | Detalle |
|-------|---------|
| **Descripcion** | Crea evento, analiza Excel crudo sin instancia intermedia y procesa resultados. |
| **Precondicion** | Ciclo activo. Clave de respuestas completa. |
| **Flujo normal** | 1. Crear evento por ciclo. 2. Definir answer key. 3. Analizar → validate-codes (sin BD). 4. Procesar → process-raw atomico. 5. Ver resultados con 3 rankings. |
| **Flujo alterno 1** | Error procesamiento: sin instancia huérfana. |
| **Postcondicion** | Resultados RAW persistidos. |

**Nota:** El matriculador **no** ve botones de eliminar evento/instancia en la interfaz (escenario 8 del administrador no aplica).

---

## Escenario 7 — Simulacro PROCESSED (importacion directa)

| Campo | Detalle |
|-------|---------|
| **Descripcion** | Importa Excel con puntajes ya calculados. |
| **Precondicion** | Evento y ciclo activos. |
| **Flujo normal** | 1. Selecciona archivo procesado. 2. Importar → `import-processed`. 3. Redireccion a dashboard con exito. |
| **Flujo alterno 1** | Sin resultados validos: rollback. |
| **Postcondicion** | Instancia PROCESSED con rankings. |

---

## Escenario 9 — Gestion de material de cursos

| Campo | Detalle |
|-------|---------|
| **Descripcion** | Administra el catalogo de cursos y los archivos de clase asociados (crear, editar, eliminar curso; subir y eliminar material). |
| **Precondicion** | Sesion autenticada con rol `matriculador` y estado `ACTIVE`. No requiere ciclo activo (`activeCycleId`). |
| **Flujo normal — catalogo** | 1. Accede a Material de Cursos (`/dashboard/cursos`). 2. Sistema carga catalogo (`GET /api/courses`). 3. Visualiza tarjetas de cursos disponibles. |
| **Flujo normal — curso** | 4. Pulsa "+ Crear Curso" y completa titulo, codigo, descripcion, modalidades y opcionalmente imagen de portada (max. 4 MB). 5. Sistema valida titulo obligatorio y al menos una modalidad. 6. Envio `POST /api/courses`. 7. Alternativamente: edita curso existente (`PATCH /api/courses/:id`) o elimina con confirmacion (`DELETE /api/courses/:id`). |
| **Flujo normal — materiales** | 8. Selecciona curso y entra al detalle (`GET /api/courses/:id`, `GET /api/courses/:courseId/materials`). 9. Pulsa "+ Subir Archivo", selecciona archivo (PDF, Office, imagenes o txt; max. 20 MB) y descripcion opcional. 10. Envio multipart `POST /api/courses/:courseId/materials`. 11. Lista de materiales se refresca. 12. Puede previsualizar (`GET /api/materials/:fileId/access-url?mode=preview`) o eliminar material (`DELETE /api/materials/:fileId`). |
| **Flujo alterno 1** | Validacion de formulario: titulo vacio o sin modalidades; formulario resaltado sin persistir. |
| **Flujo alterno 2** | Archivo invalido (tamano o tipo no permitido): mensaje de error en zona de subida. |
| **Flujo alterno 3** | Cancela confirmacion de eliminacion de curso o material: sin cambios. |
| **Flujo alterno 4** | Catalogo vacio: mensaje informativo y opcion crear primer curso. |
| **Postcondicion** | Curso y/o materiales persistidos en BD y almacenamiento de archivos. Estudiantes con modalidad compatible pueden consultar y descargar (Tabla 9, escenario 2). |
| **Casos de uso relacionados** | MATL-CU01 (crear curso), MATL-CU02 (editar curso), MATL-CU03 (eliminar curso), MATL-CU04 (subir material), MATL-CU06 (eliminar material), MATL-CU07 (consultar catalogo — staff ve todos los cursos). Nota: `PATCH /api/materials/:fileId` (MATL-CU05) existe en API pero no tiene flujo dedicado en la UI actual. |

**Nota:** Mismos permisos de gestion de material que el administrador en el sistema actual.

---

## Restricciones adicionales del matriculador

| Accion | Administrador | Matriculador |
|--------|:-------------:|:------------:|
| Eliminar evento/instancia simulacro (UI) | Si | No |
| Crear usuario rol admin (`USR-CU04`) | Si | No |
| Resto de modulos operativos | Si | Si |

---

*Fuente: elaboracion propia (sistema ADUNI Vallejo, 2026).*
