# Arquitectura de Componentes del Frontend

Este documento describe la estructura y jerarquía de los componentes en la aplicación React.

---

## 1. Estructura General

La aplicación sigue una arquitectura basada en **rutas**, donde el componente principal `App.js` actúa como el enrutador principal (`<Router>`).

La estructura se divide en dos áreas principales:
1.  **Páginas Públicas:** Rutas accesibles sin autenticación (ej. `/login`).
2.  **Páginas Protegidas (Dashboard):** Un área principal que requiere autenticación y contiene la mayor parte de la funcionalidad.

---

## 2. Componentes Clave

### `App.js`
- **Rol:** Componente raíz.
- **Función:** Define todas las rutas de la aplicación usando `react-router-dom`. No contiene elementos visuales, solo la lógica de enrutamiento.

### `Login.js`
- **Rol:** Página de inicio de sesión.
- **Ruta:** `/login`
- **Función:** Muestra el formulario de autenticación y gestiona el estado de login. Es el punto de entrada a las áreas protegidas.

### `Dashboard.js`
- **Rol:** Layout Principal o "Shell" de la Aplicación.
- **Ruta:** `/dashboard`
- **Función:** Es el componente contenedor para toda la interfaz de usuario una vez que el usuario está autenticado.
- **Estructura Interna:**
    - **`Sidebar.js`:** Renderiza la barra de navegación lateral. Es un componente hijo directo de `Dashboard` y es visible en todas las secciones del dashboard.
    - **Contenido del Módulo (Outlet):** `Dashboard` utiliza el componente `<Outlet>` de React Router para renderizar el componente del módulo que corresponda a la ruta activa (ej. `EnrollmentModule` cuando la ruta es `/dashboard/matricula`).

### `ProtectedRoute.js`
- **Rol:** Guardián de rutas.
- **Función:** Era probablemente usado para proteger rutas, pero la lógica actual en `App.js` sugiere que `Dashboard.js` ahora maneja su propia protección internamente.

---

## 3. Módulos Funcionales (Dentro de Dashboard)

Estos componentes representan las secciones principales de la aplicación y son renderizados dentro del `Dashboard`.

- **`EnrollmentModule.js` (`/matricula`):** Contiene la lógica y UI para la matrícula de estudiantes. Probablemente utiliza componentes hijos como `StudentSearchBar` y `StudentTable`.
- **`CourseModule.js` (`/cursos`):** Gestiona la creación y visualización de cursos. Utiliza componentes como `CourseCard` y `CreateCourseForm`.
- **`SimulationModule.js` (`/simulacros`):** Módulo complejo para la gestión de simulacros. Probablemente tiene sub-rutas y componentes hijos como `SimulationModalityManager` y `SimulationInstanceUpload`.
- **`AttendanceModule.js` (`/asistencia`):** Para registrar la asistencia de los estudiantes.
- **`ScheduleModule.js` (`/horarios`):** Para la gestión de horarios, posiblemente con componentes como `ScheduleEditor` y `ScheduleViewer`.
- **`MyGrades.js` (`/mis-resultados`):** Vista para que los estudiantes vean sus calificaciones y resultados.
- **`UserManager.js` (`/usuarios`):** Panel para la administración de usuarios (probablemente solo visible para roles de administrador).

---

## 4. Componentes Reutilizables / Atómicos

Estos son componentes más pequeños que probablemente se usan dentro de varios módulos.

- `CourseCard.js`: Tarjeta para mostrar información de un curso.
- `LeaderboardTable.js`: Tabla para mostrar resultados.
- `StudentSearchBar.js`: Barra de búsqueda de estudiantes.
- `StudentTable.js`: Tabla para mostrar listas de estudiantes.
- `UploadPanel.js`: Componente genérico para la subida de archivos.
