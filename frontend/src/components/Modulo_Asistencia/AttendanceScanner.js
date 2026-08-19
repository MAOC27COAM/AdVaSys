import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { attendanceService } from '../../services/attendanceService';
import { playAttendanceBeep } from '../../utils/playAttendanceBeep';
import style from './AttendanceScanner.module.css';

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

const getSessionType = (startTime) => {
  if (!startTime) return undefined;
  const d = new Date(startTime);
  const totalMin = d.getHours() * 60 + d.getMinutes();
  if (totalMin >= 420 && totalMin < 780) return 'TURN_MANANA';
  if (totalMin >= 780 && totalMin < 1140) return 'TURN_TARDE';
  return undefined;
};

function AttendanceScanner({ activeCycleId, session, onBack }) {
  const [pendingStudents, setPendingStudents] = useState([]);
  const [presentStudents, setPresentStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLateMode, setIsLateMode] = useState(false);
  const [notification, setNotification] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [presentSearch, setPresentSearch] = useState('');
  const [filters, setFilters] = useState({
    modality: 'ALL',
    group: 'ALL',
  });

  const pendingRef = useRef([]);
  const presentRef = useRef([]);
  const scannerLockRef = useRef(false);

  useEffect(() => {
    pendingRef.current = pendingStudents;
    presentRef.current = presentStudents;
  }, [pendingStudents, presentStudents]);

  const activeFilters = useMemo(
    () => ({
      modality: filters.modality !== 'ALL' ? filters.modality : undefined,
      group: filters.group !== 'ALL' ? filters.group : undefined,
      sessionType: getSessionType(session?.StartTime || session?.startTime),
    }),
    [filters, session]
  );

  useEffect(() => {
    if (!session || !activeCycleId) return;

    if (session.cycleId && Number(session.cycleId) !== Number(activeCycleId)) {
      setError('La sesion seleccionada no pertenece al ciclo activo.');
      return;
    }

    loadInitialData(activeFilters);
  }, [session, activeCycleId, activeFilters]);

  const loadInitialData = async (filterValues) => {
    try {
      setLoading(true);
      setError('');

      const allStudents = await attendanceService.getStudentListForAttendance(activeCycleId, filterValues);
      const studentsOnly = allStudents.filter((user) => user.role?.name === 'student' || user.role === 'student');

      const currentRecords = await attendanceService.getSessionDetails(session.id, activeCycleId);
      const markedIds = currentRecords
        .filter((record) => record.status === 'PRESENT' || record.status === 'LATE')
        .map((record) => record.userId);

      const remainingStudents = studentsOnly.filter((student) => !markedIds.includes(student.id));
      const alreadyPresent = studentsOnly
        .filter((student) => markedIds.includes(student.id))
        .map((student) => {
          const matchingRecord = currentRecords.find((record) => record.userId === student.id);
          return {
            ...student,
            attendanceStatus: matchingRecord?.status || 'PRESENT',
          };
        });

      setPendingStudents(remainingStudents);
      setPresentStudents(alreadyPresent);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al sincronizar el estado de la sesion');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordAttendance = async (identifierType, identifierValue) => {
    if (loading) return false;

    setLoading(true);
    try {
      const targetStatus = isLateMode ? 'LATE' : 'PRESENT';
      const result = await attendanceService.recordAttendance(
        identifierType,
        identifierValue,
        targetStatus,
        session.id
      );

      const currentValue = String(identifierValue);
      const student = pendingRef.current.find((item) => {
        const comparableValue = identifierType === 'userId' ? String(item.id) : String(item.documentId);
        return comparableValue === currentValue;
      });

      if (student) {
        setPendingStudents((prev) =>
          prev.filter((item) => {
            const comparableValue = identifierType === 'userId' ? String(item.id) : String(item.documentId);
            return comparableValue !== currentValue;
          })
        );
        setPresentStudents((prev) => [{ ...student, attendanceStatus: targetStatus }, ...prev]);
        playAttendanceBeep();
        return true;
      }

      if (result?.message === 'La asistencia para este usuario ya fue registrada en esta sesion.') {
        setNotification('Ya registrado');
        setTimeout(() => setNotification(''), 500);
        return false;
      }

      return false;
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar');
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let scanner = null;

    const startScanner = () => {
      const readerElement = document.getElementById('reader');
      if (!readerElement || error) return;

      scanner = new Html5QrcodeScanner('reader', {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
      });

      const onScanSuccess = async (decodedText) => {
        if (scannerLockRef.current) return;

        const cleanText = decodedText.trim();
        const isAlreadyPresent = presentRef.current.some((student) => String(student.documentId) === cleanText);
        if (isAlreadyPresent) {
          setNotification('Ya registrado');
          setTimeout(() => setNotification(''), 500);
          return;
        }

        scannerLockRef.current = true;
        try {
          await handleRecordAttendance('documentId', cleanText);
        } finally {
          setTimeout(() => {
            scannerLockRef.current = false;
          }, 500);
        }
      };

      scanner.render(onScanSuccess, () => {});
    };

    if (session && activeCycleId) {
      const timer = setTimeout(startScanner, 150);
      return () => {
        clearTimeout(timer);
        if (scanner) {
          scanner.clear().catch((scannerError) => console.warn('Error al cerrar scanner:', scannerError));
        }
      };
    }

    return undefined;
  }, [session, activeCycleId, error, isLateMode]);

  const handleFinalize = async () => {
    if (!window.confirm('Deseas finalizar el proceso? Los restantes se marcaran como AUSENTES.')) return;

    setLoading(true);
    try {
      const missingIds = pendingStudents.map((student) => student.id);
      await attendanceService.endSession(session.id, missingIds, activeCycleId);
      onBack();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar la sesion');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const filteredPendingStudents = pendingStudents.filter((student) => {
    if (!pendingSearch.trim()) return true;
    const query = pendingSearch.trim().toLowerCase();
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    return fullName.includes(query) || String(student.documentId || '').toLowerCase().includes(query);
  });

  const filteredPresentStudents = presentStudents.filter((student) => {
    if (!presentSearch.trim()) return true;
    const query = presentSearch.trim().toLowerCase();
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    return fullName.includes(query) || String(student.documentId || '').toLowerCase().includes(query);
  });

  return (
    <div className={style.mainContent}>
      <div className={style.sectionHeader}>
        <button className={style.secondaryBtn} onClick={onBack}>
          &larr; Volver
        </button>
        <h4 style={{ marginLeft: '15px' }}>Sesion: {session?.name}</h4>
      </div>

      {error && <div className={style.errorMessage}>{error}</div>}
      {notification && <div className={style.notification}>{notification}</div>}

      <div className={style.contentWrapper}>
        <div className={style.leftPanel}>
          <div className={style.qrContainer}>
            <div id="reader" style={{ width: '100%', minHeight: '300px' }}></div>
          </div>

          <button
            className={`${style.secondaryBtn} ${isLateMode ? style.lateModeActive : ''}`}
            style={{ marginTop: '16px', width: '100%' }}
            onClick={() => setIsLateMode((current) => !current)}
            disabled={loading || !!error}
          >
            {isLateMode ? 'Registrando Tardanzas' : 'Iniciar Registro de Tardanzas'}
          </button>

          <button
            className={style.primaryBtn}
            style={{ marginTop: '20px', width: '100%', background: '#22c55e' }}
            onClick={handleFinalize}
            disabled={loading || !!error}
          >
            {loading ? 'Procesando...' : 'Finalizar Sesion'}
          </button>
        </div>

        <div className={style.rightPanel} style={{ flex: '1.5', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className={style.filtersBar}>
            <div className={style.filterGroup}>
              <label htmlFor="attendance-modality-filter">Modalidad</label>
              <select
                id="attendance-modality-filter"
                value={filters.modality}
                onChange={(event) => handleFilterChange('modality', event.target.value)}
              >
                {MODALITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={style.filterGroup}>
              <label htmlFor="attendance-group-filter">Grupo</label>
              <select
                id="attendance-group-filter"
                value={filters.group}
                onChange={(event) => handleFilterChange('group', event.target.value)}
              >
                {GROUP_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={style.glassSection}>
            <h5>Faltan por marcar ({pendingStudents.length})</h5>
            <input
              type="text"
              className={style.searchInput}
              placeholder="Buscar por DNI o nombre..."
              value={pendingSearch}
              onChange={(event) => setPendingSearch(event.target.value)}
            />
            <div className={style.scrollList} style={{ maxHeight: '250px', overflowY: 'auto' }}>
              <table className={style.attendanceTable}>
                <tbody>
                  {filteredPendingStudents.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <div className={style.studentName}>
                          {student.firstName} {student.lastName}
                        </div>
                        <div className={style.studentMeta}>
                          {student.studentProfile?.modality || 'SIN MODALIDAD'} · {student.studentProfile?.group || 'SIN GRUPO'}
                        </div>
                        <div className={style.phoneMeta}>
                          CA: {student.phone || 'Sin dato'} · CP: {student.studentProfile?.guardianPhone || 'Sin dato'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className={style.presentButton} onClick={() => handleRecordAttendance('userId', student.id)}>
                          Marcar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPendingStudents.length === 0 && (
                    <tr>
                      <td className={style.emptyStateCell}>No hay alumnos faltantes con los filtros actuales.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={style.glassSection}>
            <h5 style={{ color: '#22c55e' }}>Ya marcaron ({presentStudents.length})</h5>
            <input
              type="text"
              className={style.searchInput}
              placeholder="Buscar por DNI o nombre..."
              value={presentSearch}
              onChange={(event) => setPresentSearch(event.target.value)}
            />
            <div className={`${style.presentListContainer} ${style.scrollList}`} style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {filteredPresentStudents.length === 0 && (
                <p style={{ opacity: 0.5, fontSize: '0.9em' }}>Nadie ha marcado aun...</p>
              )}
              {filteredPresentStudents.map((student) => (
                <span key={student.id} className={style.presentItem}>
                  <span>{student.firstName} {student.lastName}</span>
                  <small>
                    {student.studentProfile?.modality || 'SIN MODALIDAD'} · {student.studentProfile?.group || 'SIN GRUPO'} ·{' '}
                    {student.attendanceStatus === 'LATE' ? 'TARDANZA' : 'PRESENTE'}
                  </small>
                  <small>
                    CA: {student.phone || 'Sin dato'} · CP: {student.studentProfile?.guardianPhone || 'Sin dato'}
                  </small>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttendanceScanner;
