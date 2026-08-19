import React, { useEffect, useMemo, useState } from 'react';
import { attendanceService } from '../../services/attendanceService';
import style from './AttendanceHistory.module.css';

const MODALITY_OPTIONS = [
  { value: 'ALL', label: 'Todas las modalidades' },
  { value: 'PRE_U', label: 'PRE-U' },
  { value: 'SECUNDARIA', label: 'Secundaria' },
  { value: 'PRIMERA_OPCION', label: 'Primera opcion' },
  { value: 'COAR', label: 'COAR' },
  { value: 'BECA_18', label: 'Beca 18' },
  { value: 'PRIMARIA', label: 'Primaria' },
];

const GROUP_OPTIONS = [
  { value: 'ALL', label: 'Todos los grupos' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'E', label: 'E' },
];

const STATUS_LABELS = {
  PRESENT: 'PRESENTE',
  LATE: 'TARDANZA',
  ABSENT: 'FALTA',
};

function AttendanceHistory({ activeCycleId, session, onBack }) {
  const [records, setRecords] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [error, setError] = useState('');
  const [presentSearch, setPresentSearch] = useState('');
  const [absentSearch, setAbsentSearch] = useState('');
  const [filters, setFilters] = useState({
    modality: 'ALL',
    group: 'ALL',
  });

  const getSessionType = (startTime) => {
    if (!startTime) return undefined;
    const d = new Date(startTime);
    const totalMin = d.getHours() * 60 + d.getMinutes();
    if (totalMin >= 420 && totalMin < 780) return 'TURN_MANANA';
    if (totalMin >= 780 && totalMin < 1140) return 'TURN_TARDE';
    return undefined;
  };

  const activeFilters = useMemo(
    () => ({
      modality: filters.modality !== 'ALL' ? filters.modality : undefined,
      group: filters.group !== 'ALL' ? filters.group : undefined,
      sessionType: getSessionType(session?.StartTime || session?.startTime),
    }),
    [filters, session]
  );

  useEffect(() => {
    if (session?.id && activeCycleId) {
      fetchAttendanceHistory(activeFilters);
    }
  }, [session, activeCycleId, activeFilters]);

  const fetchAttendanceHistory = async (filterValues) => {
    setLoading(true);
    setError('');
    try {
      const [sessionRecords, students] = await Promise.all([
        attendanceService.getSessionDetails(session.id, activeCycleId),
        attendanceService.getStudentListForAttendance(activeCycleId, filterValues),
      ]);

      const studentsOnly = students.filter((user) => user.role?.name === 'student' || user.role === 'student');
      setRecords(sessionRecords || []);
      setFilteredStudents(studentsOnly);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron cargar los detalles.');
    } finally {
      setLoading(false);
    }
  };

  const recordByUserId = useMemo(() => {
    return records.reduce((acc, record) => {
      acc[record.userId] = record;
      return acc;
    }, {});
  }, [records]);

  const presentList = filteredStudents
    .filter((student) => {
      const status = recordByUserId[student.id]?.status;
      return status === 'PRESENT' || status === 'LATE';
    })
    .map((student) => ({
      student,
      record: recordByUserId[student.id],
    }));

  const absentList = filteredStudents
    .filter((student) => recordByUserId[student.id]?.status === 'ABSENT')
    .map((student) => ({
      student,
      record: recordByUserId[student.id],
    }));

  const normalizedPresentSearch = presentSearch.trim().toLowerCase();
  const normalizedAbsentSearch = absentSearch.trim().toLowerCase();

  const filteredPresentList = presentList.filter(({ student }) => {
    if (!normalizedPresentSearch) return true;
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    return fullName.includes(normalizedPresentSearch) || String(student.documentId || '').toLowerCase().includes(normalizedPresentSearch);
  });

  const filteredAbsentList = absentList.filter(({ student }) => {
    if (!normalizedAbsentSearch) return true;
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    return fullName.includes(normalizedAbsentSearch) || String(student.documentId || '').toLowerCase().includes(normalizedAbsentSearch);
  });

  const handleFilterChange = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleReopen = async () => {
    if (!window.confirm('Reaperturar esta sesion? Volvera a "Sesiones en curso" para continuar la marcacion.')) return;

    setReopening(true);
    setError('');
    try {
      await attendanceService.reopenSession(session.id, activeCycleId);
      onBack();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al reaperturar la sesion');
    } finally {
      setReopening(false);
    }
  };

  const formatTimestamp = (value) => {
    if (!value) return '--';
    return new Date(value).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatLongDate = (value) => {
    if (!value) return 'Sin fecha';
    return new Date(value).toLocaleDateString('es-PE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className={style.mainContent}>
      <div className={style.sectionHeader}>
        <button className={style.secondaryBtn} onClick={onBack}>
          &larr; Volver al dashboard
        </button>
        <div>
          <h4 className={style.sessionTitle}>Sesion: {session?.name}</h4>
          <small>{formatLongDate(session?.startTime || session?.StartTime)}</small>
        </div>
        <button className={style.reopenBtn} onClick={handleReopen} disabled={reopening}>
          {reopening ? 'Reaperturando...' : 'Reabrir sesion'}
        </button>
      </div>

      {error && <p className={style.errorMessage}>{error}</p>}

      <div className={style.filtersBar}>
        <div className={style.filterGroup}>
          <label className={style.filterLabel} htmlFor="attendance-history-modality">Modalidad</label>
          <select
            id="attendance-history-modality"
            value={filters.modality}
            onChange={(event) => handleFilterChange('modality', event.target.value)}
            className={style.filterSelect}
          >
            {MODALITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={style.filterGroup}>
          <label className={style.filterLabel} htmlFor="attendance-history-group">Grupo</label>
          <select
            id="attendance-history-group"
            value={filters.group}
            onChange={(event) => handleFilterChange('group', event.target.value)}
            className={style.filterSelect}
          >
            {GROUP_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={style.contentWrapper}>
        <div className={style.glassSection}>
          <div className={style.sectionTitle}>Presentes ({presentList.length})</div>
          <input
            type="text"
            className={style.searchInput}
            placeholder="Buscar por DNI o nombre..."
            value={presentSearch}
            onChange={(event) => setPresentSearch(event.target.value)}
          />
          <div className={style.scrollList}>
            {loading ? (
              <p className={style.emptyState}>Cargando...</p>
            ) : filteredPresentList.length === 0 ? (
              <p className={style.emptyState}>No hay presentes con los filtros actuales.</p>
            ) : (
              filteredPresentList.map(({ student, record }) => (
                <div key={student.id} className={style.studentRow}>
                  <div>
                    <span>{student.firstName} {student.lastName}</span>
                    <small>{student.studentProfile?.modality || 'SIN MODALIDAD'} · {student.studentProfile?.group || 'SIN GRUPO'} · DNI {student.documentId}</small>
                    <small>Hora: {formatTimestamp(record?.timestamp)}</small>
                  </div>
                  <small className={`${style.statusBadge} ${record?.status === 'LATE' ? style.lateBadge : style.presentBadge}`}>
                    {STATUS_LABELS[record?.status] || 'PRESENTE'}
                  </small>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={style.glassSection}>
          <div className={style.sectionTitle}>Faltaron ({absentList.length})</div>
          <input
            type="text"
            className={style.searchInput}
            placeholder="Buscar por DNI o nombre..."
            value={absentSearch}
            onChange={(event) => setAbsentSearch(event.target.value)}
          />
          <div className={style.scrollList}>
            {loading ? (
              <p className={style.emptyState}>Cargando...</p>
            ) : filteredAbsentList.length === 0 ? (
              <p className={style.emptyState}>No hay faltas con los filtros actuales.</p>
            ) : (
              filteredAbsentList.map(({ student, record }) => (
                <div key={student.id} className={style.studentRow}>
                  <div>
                    <span>{student.firstName} {student.lastName}</span>
                    <small>{student.studentProfile?.modality || 'SIN MODALIDAD'} · {student.studentProfile?.group || 'SIN GRUPO'} · DNI {student.documentId}</small>
                    <small>Hora: {formatTimestamp(record?.timestamp)}</small>
                  </div>
                  <small className={`${style.statusBadge} ${style.absentBadge}`}>
                    {STATUS_LABELS[record?.status] || 'FALTA'}
                  </small>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttendanceHistory;
