import React, { useEffect, useMemo, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { attendanceService } from '../../../services/attendanceService';
import { cycleService } from '../../../services/cycleService';
import style from './AttendancePuzzle.module.css';

const MODALITY_OPTIONS = [
  { value: 'PRE_U', label: 'PRE-U' },
  { value: 'ALL', label: 'Todas las modalidades' },
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

const SESSION_TYPE_OPTIONS = [
  { value: 'ALL', label: 'Todos los turnos' },
  { value: 'TURN_MANANA', label: 'Turno Manana' },
  { value: 'TURN_TARDE', label: 'Turno Tarde' },
  { value: 'TURN_COMPLETO', label: 'Tiempo Completo' },
];

const STATUS_ABBREV = {
  PRESENT: 'P',
  LATE: 'T',
  ABSENT: 'F',
};

const toPeruDateStr = (dateValue) => {
  const d = new Date(dateValue);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
};

const formatDateLabel = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', timeZone: 'America/Lima' });
};

const generateDateRange = (startStr, endStr) => {
  const dates = [];
  const cursor = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  while (cursor <= end) {
    dates.push(toPeruDateStr(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

const groupSessionsByDate = (sessions) => {
  const map = {};
  sessions.forEach((s) => {
    const dateKey = toPeruDateStr(s.startTime);
    if (!map[dateKey]) map[dateKey] = [];
    map[dateKey].push(s);
  });
  return map;
};

function AttendancePuzzle({ activeCycleId, onBack, onActionViewStudentHistory }) {
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cycleDates, setCycleDates] = useState({ startDate: null, endDate: null });
  const [searchQuery, setSearchQuery] = useState('');

  const scrollerRef = useRef(null);
  const topBarRef = useRef(null);

  const syncScroll = useCallback((source, target) => {
    if (source && target) {
      target.scrollLeft = source.scrollLeft;
    }
  }, []);

  const today = useMemo(() => toPeruDateStr(new Date()), []);

  const [filters, setFilters] = useState({
    modality: 'PRE_U',
    group: 'ALL',
    sessionType: 'ALL',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (!activeCycleId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const cycle = await cycleService.getCycleById(activeCycleId);
        if (cancelled) return;

        const cycleStart = toPeruDateStr(cycle.startDate);
        const cycleEnd = toPeruDateStr(cycle.endDate);

        const currentMonthStart = today.slice(0, 7) + '-01';

        const defaultStart = currentMonthStart < cycleStart ? cycleStart : currentMonthStart;
        const lastDayOfMonth = new Date(today.slice(0, 7) + '-01T00:00:00');
        lastDayOfMonth.setMonth(lastDayOfMonth.getMonth() + 1);
        lastDayOfMonth.setDate(lastDayOfMonth.getDate() - 1);
        const currentMonthEnd = toPeruDateStr(lastDayOfMonth);

        const defaultEnd = currentMonthEnd > cycleEnd ? cycleEnd : currentMonthEnd;

        setCycleDates({ startDate: cycle.startDate, endDate: cycle.endDate });
        setFilters((prev) => ({
          ...prev,
          startDate: defaultStart,
          endDate: defaultEnd,
        }));
      } catch (err) {
        if (!cancelled) {
          setError('No se pudo cargar la informacion del ciclo.');
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [activeCycleId, today]);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoad = useCallback(async () => {
    if (!activeCycleId || !filters.startDate || !filters.endDate) return;

    setLoading(true);
    setError('');

    try {
      const data = await attendanceService.getPuzzleData(activeCycleId, {
        modality: filters.modality,
        group: filters.group,
        sessionType: filters.sessionType,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      setStudents(data.students || []);
      setSessions(data.sessions || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar la matriz de asistencia.');
      setStudents([]);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [activeCycleId, filters]);

  useEffect(() => {
    if (activeCycleId && filters.startDate && filters.endDate && cycleDates.startDate) {
      handleLoad();
    }
  }, [activeCycleId, filters.startDate, filters.endDate, cycleDates.startDate, handleLoad]);

  const dateRange = useMemo(() => {
    if (!filters.startDate || !filters.endDate) return [];
    return generateDateRange(filters.startDate, filters.endDate);
  }, [filters.startDate, filters.endDate]);

  const sessionsByDate = useMemo(() => groupSessionsByDate(sessions), [sessions]);

  const columns = useMemo(() => {
    return dateRange.map((dateStr) => {
      const daySessions = sessionsByDate[dateStr] || [];
      return {
        dateStr,
        label: formatDateLabel(dateStr),
        sessions: daySessions,
      };
    });
  }, [dateRange, sessionsByDate]);

  useLayoutEffect(() => {
    if (topBarRef.current && scrollerRef.current) {
      const inner = topBarRef.current.querySelector('[data-scroll-inner]');
      if (inner) {
        inner.style.width = scrollerRef.current.scrollWidth + 'px';
      }
    }
  }, [students, columns]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) =>
      `${s.lastName} ${s.firstName} ${s.documentId}`.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const totalColumns = useMemo(() => {
    return columns.reduce((sum, col) => sum + Math.max(1, col.sessions.length), 0);
  }, [columns]);

  const totalPresent = useMemo(() => {
    let count = 0;
    sessions.forEach((s) => {
      Object.values(s.records).forEach((status) => {
        if (status === 'PRESENT') count++;
      });
    });
    return count;
  }, [sessions]);

  const totalLate = useMemo(() => {
    let count = 0;
    sessions.forEach((s) => {
      Object.values(s.records).forEach((status) => {
        if (status === 'LATE') count++;
      });
    });
    return count;
  }, [sessions]);

  const totalAbsent = useMemo(() => {
    let count = 0;
    sessions.forEach((s) => {
      Object.values(s.records).forEach((status) => {
        if (status === 'ABSENT') count++;
      });
    });
    return count;
  }, [sessions]);

  const getCellClass = (status) => {
    if (!status) return style.cellNoSession;
    if (status === 'PRESENT') return style.cellPresent;
    if (status === 'LATE') return style.cellLate;
    if (status === 'ABSENT') return style.cellAbsent;
    return style.cellEmpty;
  };

  const handleExport = useCallback(async () => {
    try {
      const blob = await attendanceService.exportPuzzleToExcel(activeCycleId, {
        modality: filters.modality,
        group: filters.group,
        sessionType: filters.sessionType,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rompecabeza-${filters.startDate}-${filters.endDate}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al exportar.');
    }
  }, [activeCycleId, filters]);

  return (
    <div className={style.wrapper}>
      <div className={style.header}>
        <div className={style.headerLeft}>
          {onBack && (
            <button className={style.backBtn} onClick={onBack}>
              &larr; Volver
            </button>
          )}
          <h2 className={style.title}>Rompecabeza — Matriz de Asistencia</h2>
        </div>
        {/* {students.length > 0 && columns.length > 0 && (
          <button className={style.exportBtn} onClick={handleExport}>
            Exportar Excel
          </button>
        )} */}
      </div>

      <div className={style.filtersBar}>
        <div className={style.filterGroup}>
          <label>Modalidad</label>
          <select
            value={filters.modality}
            onChange={(e) => handleFilterChange('modality', e.target.value)}
          >
            {MODALITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className={style.filterGroup}>
          <label>Grupo</label>
          <select
            value={filters.group}
            onChange={(e) => handleFilterChange('group', e.target.value)}
          >
            {GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className={style.filterGroup}>
          <label>Turno</label>
          <select
            value={filters.sessionType}
            onChange={(e) => handleFilterChange('sessionType', e.target.value)}
          >
            {SESSION_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className={style.filterGroup}>
          <label>Fecha inicio</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
        </div>

        <div className={style.filterGroup}>
          <label>Fecha fin</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
        </div>

        <button className={style.loadBtn} onClick={handleLoad} disabled={loading}>
          {loading ? 'Cargando...' : 'Cargar'}
        </button>
        {students.length > 0 && columns.length > 0 && (
          <button className={style.exportBtn} onClick={handleExport}>
            Exportar Excel
          </button>
        )}
      </div>

      {error && <div className={style.errorBox}>{error}</div>}

      <div className={style.summaryRow}>
        <span>Estudiantes: <strong>{filteredStudents.length}</strong>{searchQuery.trim() ? ` / ${students.length}` : ''}</span>
        <span>Dias: <strong>{columns.length}</strong></span>
        {/* <span>Columnas: <strong>{totalColumns}</strong></span>
        <span>Presentes: <strong style={{ color: '#4ade80' }}>{totalPresent}</strong></span>
        <span>Tardanzas: <strong style={{ color: '#fb923c' }}>{totalLate}</strong></span>
        <span>Faltas: <strong style={{ color: '#f87171' }}>{totalAbsent}</strong></span> */}
      </div>

      {loading && <div className={style.loadingState}>Cargando matriz...</div>}

      {!loading && columns.length === 0 && (
        <div className={style.emptyState}>Selecciona un rango de fechas y presiona "Cargar".</div>
      )}

      {!loading && columns.length > 0 && students.length === 0 && (
        <div className={style.emptyState}>No se encontraron estudiantes con los filtros seleccionados.</div>
      )}

      {!loading && columns.length > 0 && students.length > 0 && (
        <div className={style.matrixContainer}>
          <div
            ref={topBarRef}
            className={style.topScrollbar}
            onScroll={(e) => syncScroll(e.target, scrollerRef.current)}
          >
            <div data-scroll-inner className={style.topScrollInner} />
          </div>
          <div
            ref={scrollerRef}
            className={style.matrixScroller}
            onScroll={(e) => syncScroll(e.target, topBarRef.current)}
          >
            <table className={style.matrixTable}>
              <thead>
                <tr>
                  <th className={style.cornerCell}>Estudiante</th>
                  {columns.map((col) => (
                    <th
                      key={col.dateStr}
                      colSpan={Math.max(1, col.sessions.length)}
                      className={style.dateHeader}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className={style.searchCell}>
                    <input
                      className={style.searchInput}
                      type="text"
                      placeholder="Buscar por nombre o DNI..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </th>
                  {/* <th className={style.cornerCell}></th> */}

                  {columns.map((col) =>
                    col.sessions.length === 0 ? (
                      <th key={`${col.dateStr}-empty`} className={style.sessionHeaderEmpty}>-</th>
                    ) : (
                      col.sessions.map((session) => (
                        <th key={`${col.dateStr}-${session.id}`} className={style.sessionHeader}>
                          {session.name || 'Sesion'}
                        </th>
                      ))
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                <tr className={style.searchRow}>
                {/* <<td className={style.searchCell}>
                  <input
                    className={style.searchInput}
                    type="text"
                    placeholder="Buscar por nombre o DNI..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </td>> */}
                  {columns.map((col) =>
                    col.sessions.length === 0 ? (
                      <td key={`search-${col.dateStr}`} className={style.searchSpacer} />
                    ) : (
                      col.sessions.map((session) => (
                        <td key={`search-${col.dateStr}-${session.id}`} className={style.searchSpacer} />
                      ))
                    )
                  )}
                </tr>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td className={style.noResultsCell} colSpan={totalColumns + 1}>
                      Ningun estudiante coincide con la busqueda.
                    </td>
                  </tr>
                ) : filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className={style.studentRow}
                    onClick={() => onActionViewStudentHistory && onActionViewStudentHistory(student)}
                  >
                    <td className={style.studentCell}>
                      <span className={style.studentName}>
                        {student.lastName}, {student.firstName}
                      </span>
                      <span className={style.studentSchedule}>
                        {student.studentProfile?.schedule || 'SIN TURNO'}
                      </span>
                    </td>
                    {columns.map((col) =>
                      col.sessions.length === 0 ? (
                        <td key={`${student.id}-${col.dateStr}-empty`} className={`${style.statusCell} ${style.cellNoSession}`}>
                          <span className={style.statusLetter}>-</span>
                        </td>
                      ) : (
                        col.sessions.map((session) => {
                          const status = session.records[student.id] || null;
                          const statusAbbrev = STATUS_ABBREV[status] || '-';
                          return (
                            <td
                              key={`${student.id}-${session.id}`}
                              className={`${style.statusCell} ${getCellClass(status)} ${style.cellWithTooltip}`}
                            >
                              <span className={style.statusLetter}>{statusAbbrev}</span>
                              {status && (
                                <span className={style.cellTooltip}>
                                  {session.name} — {statusAbbrev === 'P' ? 'PRESENTE' : statusAbbrev === 'T' ? 'TARDANZA' : 'FALTA'}
                                </span>
                              )}
                            </td>
                          );
                        })
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendancePuzzle;