// Importaciones de React y librerías externas.
import React from 'react';
import { NavLink } from 'react-router-dom'; // Componente para la navegación que añade estilos al enlace activo.
import { 
  GraduationCap,
  Users, 
  BookOpen, 
  ClipboardCheck,   
  Calendar, 
  Clock, 
  Award,
  History,
  FileText,
  Wallet,
  Database
} from 'lucide-react'; // Paquete de iconos para la interfaz.
import styles from './Sidebar.module.css'; // Estilos CSS específicos para este componente.

/**
 * Componente Sidebar: Muestra la barra de navegación lateral principal de la aplicación.
 * @param {object} props - Propiedades del componente.
 * @param {string} props.userRole - El rol del usuario actualmente autenticado (ej. 'admin', 'student').
 */
function Sidebar({ userRole, isOpen, onClose }) {
  // Ahora estas variables ya existen y no darán error
  const sidebarClass = `${styles.sidebarContainer} ${isOpen ? styles.sidebarOpen : ''}`;

   
  // --- Bloque de Comprobación de Roles ---
  // Se definen constantes booleanas para simplificar la lógica de renderizado condicional.
  // Esto hace que el JSX sea más legible y fácil de mantener.
  const isMatriculador = userRole === 'matriculador' || userRole === 'kami';
  const isAdmin = userRole === 'admin' || userRole === 'kami';
  const isStudent = userRole === 'student';
  const isTeacher = userRole === 'teacher';
  const iskami = userRole === 'kami';
   
  // --- Función de Estilo para NavLink ---
  /**
   * Determina la clase CSS para un enlace de navegación.
   * Si el enlace está activo (coincide con la URL actual), se le añade una clase 'active'.
   * @param {object} navData - Objeto proporcionado por NavLink.
   * @param {boolean} navData.isActive - Verdadero si el enlace está activo.
   * @returns {string} Las clases CSS a aplicar.
   */
  const getNavLinkClass = ({ isActive }) =>
    isActive ? `${styles.navLink} ${styles.active}` : styles.navLink;


  // --- Renderizado del Componente ---
  return (
    // Contenedor principal de la barra lateral.
    <>
      {/* Overlay: aparece detrás del sidebar y cierra al tocarlo */}
      {isOpen && (
        <div className={styles.sidebarOverlay} onClick={onClose} />
      )}
    <aside className={sidebarClass}>
      <nav className={styles.sidebarNav}  >
        <ul onClick={onClose}>
          {/* Bloque de enlaces para roles administrativos (Admin, Matriculador, Kami) */}
          {(isAdmin || isMatriculador || iskami) && (
            <>
              <li>
                <NavLink to="/dashboard/matricula" className={getNavLinkClass}>
                  <Users size={20} className={styles.navIcon} />
                  <span>Matrícula</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/dashboard/simulacros" className={getNavLinkClass}>
                  <ClipboardCheck size={20} className={styles.navIcon} />
                  <span>Simulacros</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/dashboard/asistencia" className={getNavLinkClass}>
                  <Clock size={20} className={styles.navIcon} />
                  <span>Asistencia</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/dashboard/cursos" className={getNavLinkClass}>
                  <FileText size={20} className={styles.navIcon} />
                  <span>Material de Cursos</span>
                </NavLink>
              </li>
              {/*<li>
                <NavLink to="/dashboard/horarios" className={getNavLinkClass}>
                  <Calendar size={20} className={styles.navIcon} />
                  <span>Horarios</span>
                </NavLink>
              </li>*/}
              <li>
              <NavLink to="/dashboard/usuarios" className={getNavLinkClass}>
                <Users size={20} className={styles.navIcon} />
                <span>Usuarios</span>
              </NavLink>
            </li>
            </>
          )}

          {(userRole === 'admin' || userRole === 'matriculador') && (
            <li>
              <NavLink to="/dashboard/pagos" className={getNavLinkClass}>
                <Wallet size={20} className={styles.navIcon} />
                <span>Pagos</span>
              </NavLink>
            </li>
          )}

          {(isAdmin) && (
            <li>
              <NavLink to="/dashboard/backup" className={getNavLinkClass}>
                <Database size={20} className={styles.navIcon} />
                <span>Backup DB</span>
              </NavLink>
            </li>
          )}

          {/* Bloque de enlaces exclusivo para el rol de Administrador y Kami  
          {(isAdmin || iskami )&& (
            <li>
              <NavLink to="/dashboard/usuarios" className={getNavLinkClass}>
                <Users size={20} className={styles.navIcon} />
                <span>Usuarios</span>
              </NavLink>
            </li>
            
          )}*/}

          {/* Bloque de enlaces para el rol de Docente */}
          {userRole === 'teacher' && (
            <li>
              <NavLink to="/dashboard/cursos" className={getNavLinkClass}>
                <FileText size={20} className={styles.navIcon} />
                <span>Material de Cursos</span>
              </NavLink>
            </li>
          )}

          {/* Bloque de enlaces para el rol de Estudiante */}
          {(isStudent || iskami) && (
            <>
              <li>
                <NavLink to="/dashboard/mis-resultados" className={getNavLinkClass}>
                  <Award size={20} className={styles.navIcon} />
                  <span>Mis Resultados</span>
                </NavLink>
              </li>
              {/*<li>
                <NavLink to="/dashboard/horarios" className={getNavLinkClass}>
                  <Calendar size={20} className={styles.navIcon} />
                  <span>Horarios</span>
                </NavLink>
              </li>*/}
              <li>
                <NavLink to="/dashboard/cursos" className={getNavLinkClass}>
                  <FileText size={20} className={styles.navIcon} />
                  <span>Material de Cursos</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/dashboard/mis-asistencias" className={getNavLinkClass}>
                  <History size={20} className={styles.navIcon} />
                  <span>Mis Asistencias</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/dashboard/perfil" className={getNavLinkClass}>
                  <GraduationCap size={20} className={styles.navIcon} />
                  <span>Perfil</span>
                </NavLink>
              </li>
            </>
            
            
          )}
          {/* Enlace común a Materiales, visible para la mayoría de roles  
          <li>
            <NavLink to="/dashboard/cursos" className={getNavLinkClass}>
              {isTeacher ? <BookOpen size={20} /> : <FileText size={20} />}
              <span>{isTeacher ? 'Gestión de Cursos' : 'Material de Cursos'}</span>
            </NavLink>
          </li>*/}
        </ul>
      </nav>
    </aside>
    </>
  );
  
}

export default Sidebar;
