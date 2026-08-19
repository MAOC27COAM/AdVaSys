# Tabla 9. Documentacion del flujo de eventos — Estudiante

**Caso de Uso del Sistema:** Estudiante  
**Actor principal:** Estudiante (matriculado)  
**Sistema:** Intranet academica ADUNI Vallejo  

---

## Escenario 1 — Autenticacion y acceso al portal

| Campo | Detalle |
|-------|---------|
| **Descripcion** | El estudiante inicia sesion y accede a las funciones de autoservicio academico. |
| **Precondicion** | Cuenta con rol `student`, estado `ACTIVE` y al menos una matricula historica o vigente. |
| **Flujo normal** | 1. Ingresa usuario y contrasena en `/login`. 2. Sistema valida credenciales (`POST /api/auth/login`). 3. Emite JWT con vigencia acorde al rol. 4. Redirige a `/dashboard/cursos` (Material de Cursos). 5. Sidebar muestra: Mis Resultados, Material de Cursos, Mis Asistencias, Perfil. |
| **Flujo alterno 1** | Credenciales incorrectas: mensaje de error. |
| **Flujo alterno 2** | Cuenta inactiva: acceso denegado (403). |
| **Flujo alterno 3** | Debe cambiar contrasena: flujo obligatorio antes del dashboard. |
| **Postcondicion** | Sesion estudiante activa; puede navegar modulos permitidos. |

---

## Escenario 2 — Consultar y descargar materiales

| Campo | Detalle |
|-------|---------|
| **Descripcion** | Visualiza cursos y materiales academicos permitidos segun su modalidad. |
| **Precondicion** | Sesion activa. Perfil con modalidad asignada. |
| **Flujo normal** | 1. Accede a Material de Cursos. 2. Sistema lista cursos filtrados por modalidad (`GET /api/courses`). 3. Selecciona curso. 4. Visualiza materiales (`GET /api/courses/:id/materials`). 5. Solicita descarga (`GET /api/materials/:fileId/access-url`). 6. Sistema valida permiso y entrega URL de acceso. 7. Descarga o previsualiza PDF segun tipo. |
| **Flujo alterno 1** | Sin cursos para su modalidad: lista vacia con mensaje. |
| **Flujo alterno 2** | Material restringido: acceso denegado en backend. |
| **Postcondicion** | Estudiante obtiene material autorizado. |

---

## Escenario 3 — Consultar mis resultados de simulacros

| Campo | Detalle |
|-------|---------|
| **Descripcion** | Revisa sus puntajes y puestos en simulacros de ciclos donde estuvo matriculado. |
| **Precondicion** | Sesion estudiante. Existen resultados procesados asociados a su `studentId`. |
| **Flujo normal** | 1. Accede a Mis Resultados (`/dashboard/mis-resultados`). 2. Sistema consulta `GET /api/grades/me/simulation-results`. 3. Backend filtra por ciclos con `CycleEnrollment` del estudiante. 4. Muestra tabla: evento, ciclo, puntaje, puesto global, puesto por modalidad, puesto por grupo. 5. Estudiante revisa historico personal. |
| **Flujo alterno 1** | Sin resultados: mensaje informativo. |
| **Flujo alterno 2** | Simulacro de ciclo no matriculado: no aparece en listado. |
| **Postcondicion** | Estudiante visualiza su rendimiento personal. |

---

## Escenario 4 — Consultar perfil y codigo QR

| Campo | Detalle |
|-------|---------|
| **Descripcion** | Consulta datos personales/academicos y muestra QR para registro de asistencia. |
| **Precondicion** | Sesion activa. |
| **Flujo normal** | 1. Accede a Perfil (`/dashboard/perfil`). 2. Sistema carga datos (`GET /api/Perfil/:id` — solo perfil propio). 3. Muestra nombres, DNI, modalidad, grupo, ciclo, foto. 4. Renderiza codigo QR con documento de identidad. 5. Estudiante amplia QR en pantalla para escaneo en asistencia. |
| **Flujo alterno 1** | Sin foto de perfil: placeholder visible. |
| **Postcondicion** | Datos personales consultados; QR disponible para asistencia. |

---

## Escenario 5 — Consultar historial personal de asistencia

| Campo | Detalle |
|-------|---------|
| **Descripcion** | Revisa sus registros de asistencia por sesion (presente, tardanza, falta). |
| **Precondicion** | Sesion activa. |
| **Flujo normal — Mis Asistencias** | 1. Accede a Mis Asistencias (`/dashboard/mis-asistencias`). 2. `GET /api/attendance/my-history`. 3. Lista cronologica agrupada por sesion: nombre, fecha, hora, estado (PRESENTE/TARDANZA/FALTA). |
| **Flujo normal — desde Perfil** | 4. Alternativamente consulta bloque integrado de asistencia dentro de Perfil. |
| **Flujo alterno 1** | Sin registros: mensaje vacio. |
| **Postcondicion** | Estudiante conoce su historial de asistencia personal. |

---

## Matriz de acceso del estudiante

| Modulo | Acceso |
|--------|--------|
| Matricula | No |
| Pagos administrativos | No |
| Usuarios | No |
| Asistencia administrativa | No |
| Simulacros (gestion) | No |
| Material de Cursos | Si (consulta) |
| Mis Resultados | Si |
| Mis Asistencias | Si |
| Perfil / QR | Si |

---

*Fuente: elaboracion propia (sistema ADUNI Vallejo, 2026).*
