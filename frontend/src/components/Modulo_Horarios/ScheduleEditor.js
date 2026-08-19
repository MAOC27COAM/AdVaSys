import React, { useState, useEffect } from 'react';
import { scheduleService } from '../../services/scheduleService';
import styles from './ScheduleEditor.module.css';

const initialScheduleData = {
  name: '',
  modality: '',
  group: '',
  sessions: [],
};

const initialSession = {
  dayOfWeek: 'LUNES',
  startTime: '',
  endTime: '',
  classroom: '',
  courseId: '',
  teacherId: '',
};

function ScheduleEditor({ userRole }) {
  const [scheduleData, setScheduleData] = useState(initialScheduleData);
  const [schedules, setSchedules] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userRole === 'matriculador' || userRole === 'admin' || userRole === 'kami') {
      fetchSchedules();
      fetchCoursesAndTeachers();
    }
  }, [userRole]);

  const fetchSchedules = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await scheduleService.getSchedules();
      setSchedules(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar horarios');
    } finally {
      setLoading(false);
    }
  };

  const fetchCoursesAndTeachers = async () => {
    // TODO: Implementar userService.getTeachers() y courseService.getAllCourses()
    // Por ahora, datos mock
    setCourses([
      { id: 1, title: 'Matemáticas' },
      { id: 2, title: 'Física' },
      { id: 3, title: 'Química' },
      { id: 4, title: 'Biología' }
    ]);
    setTeachers([
      { id: 101, firstName: 'Juan', lastName: 'Pérez' },
      { id: 102, firstName: 'María', lastName: 'Gómez' },
      { id: 103, firstName: 'Carlos', lastName: 'López' }
    ]);
  };

  const handleScheduleChange = (e) => {
    const { name, value } = e.target;
    setScheduleData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddSession = () => {
    setScheduleData(prev => ({
      ...prev,
      sessions: [...prev.sessions, { ...initialSession, id: Date.now() }],
    }));
  };

  const handleSessionChange = (index, e) => {
    const { name, value } = e.target;
    const updatedSessions = scheduleData.sessions.map((session, i) =>
      i === index ? { ...session, [name]: value } : session
    );
    setScheduleData(prev => ({ ...prev, sessions: updatedSessions }));
  };

  const handleRemoveSession = (idToRemove) => {
    setScheduleData(prev => ({
      ...prev,
      sessions: prev.sessions.filter(session => session.id !== idToRemove),
    }));
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const sessionsToSend = scheduleData.sessions.map(session => ({
        ...session,
        courseId: parseInt(session.courseId),
        teacherId: session.teacherId ? parseInt(session.teacherId) : null,
        startTime: new Date(`2000-01-01T${session.startTime}:00`),
        endTime: new Date(`2000-01-01T${session.endTime}:00`),
      }));
      const payload = { ...scheduleData, sessions: sessionsToSend };
      await scheduleService.createSchedule(payload);
      setScheduleData(initialScheduleData);
      fetchSchedules();
      alert("✅ Horario creado exitosamente.");
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear horario');
    } finally {
      setLoading(false);
    }
  };

  if (userRole !== 'matriculador' && userRole !== 'admin' && userRole !== 'kami') {
    return (
      <div className={styles.accessDenied}>
        <p>Acceso denegado. Solo MATRICULADOR o ADMIN pueden editar horarios.</p>
      </div>
    );
  }

  return (
    <div className={styles.scheduleEditor}>
      <h3>Editor de Horarios</h3>

      {error && <div className={styles.errorMessage}>{error}</div>}
      {loading && <div className={styles.loadingMessage}>Cargando...</div>}

      <h4>Crear Nuevo Horario</h4>
      <form onSubmit={handleCreateSchedule} className={styles.scheduleForm}>
        <input 
          type="text" 
          name="name" 
          value={scheduleData.name} 
          onChange={handleScheduleChange} 
          placeholder="Nombre del Horario (ej. Horario PRE_U Mañana)" 
          required 
        />
        
        <select 
          name="modality" 
          value={scheduleData.modality} 
          onChange={handleScheduleChange} 
          required
        >
          <option value="">Seleccionar Modalidad</option>
          <option value="PRE_U">PRE_U</option>
          <option value="BECA_18">BECA_18</option>
          <option value="SECUNDARIA">SECUNDARIA</option>
          <option value="PRE_SM_UNI">PRE_SM_UNI</option>
          <option value="PRE_SM_UNFV">PRE_SM_UNFV</option>
        </select>
        
        <input 
          type="text" 
          name="group" 
          value={scheduleData.group} 
          onChange={handleScheduleChange} 
          placeholder="Grupo (ej. A, B, C)" 
          required 
        />

        <h4>📚 Sesiones de Clase</h4>
        <div className={styles.sessionsContainer}>
          {scheduleData.sessions.map((session, index) => (
            <div key={session.id} className={styles.sessionCard}>
              <select 
                name="dayOfWeek" 
                value={session.dayOfWeek} 
                onChange={(e) => handleSessionChange(index, e)} 
                required
              >
                <option value="">Seleccionar Día</option>
                <option value="LUNES">Lunes</option>
                <option value="MARTES">Martes</option>
                <option value="MIERCOLES">Miércoles</option>
                <option value="JUEVES">Jueves</option>
                <option value="VIERNES">Viernes</option>
                <option value="SABADO">Sábado</option>
                <option value="DOMINGO">Domingo</option>
              </select>
              
              <input 
                type="time" 
                name="startTime" 
                value={session.startTime} 
                onChange={(e) => handleSessionChange(index, e)} 
                placeholder="Hora inicio"
                required 
              />
              
              <input 
                type="time" 
                name="endTime" 
                value={session.endTime} 
                onChange={(e) => handleSessionChange(index, e)} 
                placeholder="Hora fin"
                required 
              />
              
              <input 
                type="text" 
                name="classroom" 
                value={session.classroom} 
                onChange={(e) => handleSessionChange(index, e)} 
                placeholder="Aula (ej. A-101)" 
              />
              
              <select 
                name="courseId" 
                value={session.courseId} 
                onChange={(e) => handleSessionChange(index, e)} 
                required
              >
                <option value="">Seleccionar Curso</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              
              <select 
                name="teacherId" 
                value={session.teacherId} 
                onChange={(e) => handleSessionChange(index, e)}
              >
                <option value="">Profesor (Opcional)</option>
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.firstName} {teacher.lastName}
                  </option>
                ))}
              </select>
              
              <button 
                type="button" 
                onClick={() => handleRemoveSession(session.id)}
                className={styles.removeSessionButton}
              >
                🗑️ Eliminar Sesión
              </button>
            </div>
          ))}
        </div>
        
        <button 
          type="button" 
          onClick={handleAddSession}
          className={styles.addSessionButton}
        >
          ➕ Añadir Sesión
        </button>

        <button 
          type="submit" 
          disabled={loading}
          className={styles.submitButton}
        >
          {loading ? 'Guardando...' : '💾 Guardar Horario'}
        </button>
      </form>

      <h4>📋 Horarios Existentes</h4>
      {schedules.length > 0 ? (
        <ul className={styles.schedulesList}>
          {schedules.map(schedule => (
            <li key={schedule.id} className={styles.scheduleItem}>
              <strong>{schedule.name}</strong> ({schedule.modality} - Grupo {schedule.group})
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptySchedulesMessage}>
          No hay horarios creados aún
        </p>
      )}
    </div>
  );
}

export default ScheduleEditor;