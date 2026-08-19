// Importaciones de React y hooks de react-router-dom.
import React from 'react';
import { Routes, Route, Outlet, useOutletContext, NavLink } from 'react-router-dom';
import styles from './ScheduleModule.module.css'; // Estilos específicos.

// Importación de los sub-componentes que actúan como páginas dentro de este módulo.
import ScheduleEditor from './ScheduleEditor';
import ScheduleViewer from './ScheduleViewer';

/**
 * Componente ScheduleModule: Actúa como un contenedor y enrutador principal para la sección de Horarios.
 * Muestra diferentes vistas (editor o visor) dependiendo del rol del usuario.
 */
function ScheduleModule() {
  // --- Bloque de Hooks ---
  // Obtiene el `userRole` del contexto proporcionado por el componente padre (Dashboard).
  const { userRole } = useOutletContext();

  // --- Renderizado del Componente ---
  return (
    <div className={styles.scheduleModule}>
      <h2>Horarios</h2>
      
      {/* --- Bloque de Navegación Interna del Módulo --- */}
      {/* Esta navegación permite al usuario moverse entre las sub-secciones del módulo de horarios. */}
      <nav>
        {/* Enlace al editor de horarios, solo visible para roles administrativos. */}
        {(userRole === 'matriculador' || userRole === 'admin' || userRole === 'kami') && (
          <NavLink 
            to="editor" 
            // Aplica una clase 'active' si la ruta actual coincide con el enlace.
            className={({ isActive }) => (isActive ? styles.activeLink : '')}
          >
            Editor de Horarios
          </NavLink>
        )}
        {/* Enlace al visor de horarios, solo visible para estudiantes. */}
        {userRole === 'student' && (
          <NavLink 
            to="mi-horario" 
            className={({ isActive }) => (isActive ? styles.activeLink : '')}
          >
            Mi Horario
          </NavLink>
        )}
      </nav>

      {/* --- Bloque de Enrutamiento Interno --- */}
      {/* `Routes` define qué componente se renderizará basado en la URL anidada. */}
      <Routes>
        {/* Define la ruta para el editor, accesible solo para roles administrativos. */}
        {(userRole === 'matriculador' || userRole === 'admin' || userRole === 'kami') && (
          <Route path="editor" element={<ScheduleEditor userRole={userRole} />} />
        )}
        {/* Define la ruta para el visor, accesible solo para estudiantes. */}
        {userRole === 'student' && (
          <Route path="mi-horario" element={<ScheduleViewer userRole={userRole} />} />
        )}
        
        {/* Ruta 'index': Muestra un mensaje por defecto cuando se visita la ruta base del módulo. */}
        <Route 
          index 
          element={
            <h3>
              Selecciona una opción del módulo de horarios.
            </h3>
          } 
        />
      </Routes>

      {/* El Outlet se usa si hay más niveles de rutas anidadas, aunque aquí no parece tener un uso activo. */}
      <Outlet />
    </div>
  );
}

export default ScheduleModule;