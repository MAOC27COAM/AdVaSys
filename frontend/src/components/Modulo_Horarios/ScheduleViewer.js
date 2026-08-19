// Importaciones de React, servicios y hooks.
import React, { useState, useEffect } from 'react';
import { scheduleService } from '../../services/scheduleService'; // Servicio para la API de horarios.
import { useAuth } from '../../context/AuthContext'; // Hook para acceder al contexto de autenticación y obtener información del usuario.
import styles from './ScheduleViewer.module.css'; // Estilos CSS específicos para este componente.

/**
 * Componente ScheduleViewer: Muestra el horario asignado al estudiante autenticado.
 * Permite visualizar las clases organizadas por día y exportar el horario a PDF.
 * @param {object} props - Propiedades del componente.
 * @param {string} props.userRole - El rol del usuario actual.
 */
function ScheduleViewer({ userRole }) {
  // --- Bloque de Hooks y Estado ---
  const { user } = useAuth(); // Obtiene el objeto `user` del contexto de autenticación.
  // Almacena el objeto del horario del estudiante.
  const [schedule, setSchedule] = useState(null);
  // Indica si se está cargando el horario.
  const [loading, setLoading] = useState(true);
  // Almacena mensajes de error.
  const [error, setError] = useState('');

  // --- Efecto Secundario para Cargar Datos ---
  // Se ejecuta al montar el componente o cuando cambian `user` o `userRole`.
  // Solo carga el horario si el usuario está autenticado y tiene el rol de 'student'.
  useEffect(() => {
    if (user && userRole === 'student') {
      fetchSchedule();
    }
  }, [user, userRole]);

  /**
   * Obtiene el horario del estudiante desde la API.
   */
  const fetchSchedule = async () => {
    setLoading(true);
    setError('');
    try {
      // Llama a la API para obtener los horarios. Se asume que el servicio filtra por el estudiante logueado.
      const data = await scheduleService.getSchedules();
      // Se espera que el servicio devuelva un array, tomamos el primero si existe.
      setSchedule(data.length > 0 ? data[0] : null);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar tu horario');
    } finally {
      setLoading(false);
    }
  };

  // --- Manejador de Eventos ---
  /**
   * Exporta el horario actual a un archivo PDF.
   */
  const handleExportPdf = async () => {
    if (!schedule) return; // No hacer nada si no hay horario para exportar.
    setLoading(true);
    setError('');
    try {
      const blob = await scheduleService.exportScheduleToPdf(schedule.id);
      // Crea una URL temporal para el archivo PDF recibido del backend.
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      // Simula un clic en un enlace para iniciar la descarga del PDF.
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `horario-${schedule.name}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url); // Libera la memoria del navegador.
    } catch (err) {
      setError(err.response?.data?.error || 'Error al exportar horario a PDF');
    } finally {
      setLoading(false);
    }
  };

  // --- Bloques de Renderizado Condicional (Protección de Ruta y Estados) ---
  // Muestra un mensaje de acceso denegado si el usuario no es un estudiante.
  if (userRole !== 'student') {
    return (
      <div className={styles.accessDenied}>
        <p>Acceso denegado. Solo ESTUDIANTES pueden ver su horario.</p>
      </div>
    );
  }

  // Muestra un mensaje de carga.
  if (loading) {
    return <div className={styles.loadingMessage}>Cargando tu horario...</div>;
  }

  // Muestra un mensaje de error si ocurre alguno.
  if (error) {
    return (
      <div className={styles.errorMessage}>
        <p>{error}</p>
      </div>
    );
  }

  // Muestra un mensaje si no se encontró ningún horario.
  if (!schedule) {
    return (
      <div className={styles.noScheduleMessage}>
        <p>No se encontró ningún horario asignado para ti.</p>
      </div>
    );
  }

  // Array de días de la semana para iterar y mostrar el horario.
  const days = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

  // --- Renderizado Principal del Componente ---
  return (
    <div className={styles.scheduleViewer}>
      {/* Encabezado del visor de horarios con título, información del horario y botón de exportar */}
      <div className={styles.scheduleHeader}>
        <div>
          <h3 className={styles.scheduleTitle}>Mi Horario</h3>
          <div className={styles.scheduleInfo}>
            <span>{schedule.name}</span>
            <span>•</span>
            <span>{schedule.modality}</span>
            <span>•</span>
            <span>Grupo {schedule.group}</span>
          </div>
        </div>
        <button onClick={handleExportPdf} disabled={loading} className={styles.exportButton}>
          Exportar a PDF
        </button>
      </div>

      {/* Contenedor principal que organiza el horario por días */}
      <div className={styles.daysContainer}>
        {days.map(day => {
          // Filtra las sesiones que corresponden a cada día de la semana.
          const daySessions = schedule.sessions.filter(session => session.dayOfWeek === day);
          
          return (
            <div key={day} className={styles.dayCard}> {/* Tarjeta para cada día */}
              <h4 className={styles.dayTitle}>{day}</h4>
              
              {daySessions.length > 0 ? (
                // Lista de sesiones si hay clases programadas para el día.
                <ul className={styles.sessionsList}>
                  {daySessions.map(session => (
                    <li key={session.id} className={styles.sessionItem}> {/* Ítem de cada sesión de clase */}
                      <div className={styles.sessionTime}> {/* Horario de la sesión */}
                        {new Date(session.startTime).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })} - {new Date(session.endTime).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </div>
                      <div className={styles.sessionCourse}>{session.course?.title || 'Curso Desconocido'}</div>
                      <div className={styles.sessionTeacher}>{session.teacher ? `${session.teacher.firstName} ${session.teacher.lastName}` : 'Profesor no asignado'}</div>
                      {session.classroom && <div className={styles.sessionClassroom}>📍 Aula: {session.classroom}</div>}
                      {session.observations && <div className={styles.sessionObservations}>💬 {session.observations}</div>}
                    </li>
                  ))}
                </ul>
              ) : (
                // Mensaje si no hay sesiones para el día.
                <p className={styles.noSessionsMessage}>No hay clases programadas para este día</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ScheduleViewer;