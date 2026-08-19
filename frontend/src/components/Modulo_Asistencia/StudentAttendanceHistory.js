import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { attendanceService } from '../../services/attendanceService';
import { cycleService } from '../../services/cycleService';
import style from './StudentAttendanceHistory.module.css';

const STATUS_LABELS = {
  PRESENT: 'PRESENTE',
  LATE: 'TARDANZA',
  ABSENT: 'FALTA',
};

const STATUS_CLASSNAMES = {
  PRESENT: style.presentStatus,
  LATE: style.lateStatus,
  ABSENT: style.absentStatus,
};

const formatLongDate = (value) =>
  new Date(value).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

function StudentAttendanceHistory({
  studentId = null,
  cycleId = null,
  title = 'Historial de Asistencia',
  onBack = null,
  embedded = false,
  studentInfo = null,
}) {
  const [records, setRecords] = useState([]);
  const [resolvedStudent, setResolvedStudent] = useState(studentInfo);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cycleDates, setCycleDates] = useState({ startDate: null, endDate: null });
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      setLoading(true);
      setError('');

      try {
        if (studentId) {
          if (!cycleId) {
            throw new Error('Se requiere un ciclo activo.');
          }

          const result = await attendanceService.getStudentAttendanceHistory(studentId, cycleId);
          if (!cancelled) {
            setResolvedStudent(result.student || studentInfo || null);
            setRecords(result.records || []);
          }
        } else {
          const result = await attendanceService.getMyAttendanceHistory();
          if (!cancelled) {
            setRecords(result || []);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || err.message || 'No se pudo cargar el historial.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [studentId, cycleId, studentInfo]);

  useEffect(() => {
    if (!cycleId) return;
    let cancelled = false;

    const loadCycleDates = async () => {
      try {
        const cycle = await cycleService.getCycleById(cycleId);
        if (!cancelled) {
          setCycleDates({ startDate: cycle.startDate, endDate: cycle.endDate });
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error al cargar fechas del ciclo:', err);
        }
      }
    };

    loadCycleDates();
    return () => { cancelled = true; };
  }, [cycleId]);

  const handleExport = useCallback(async () => {
    if (!resolvedStudent || !cycleId) return;

    try {
      const blob = await attendanceService.exportStudentAttendanceHistory(resolvedStudent.id, cycleId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `asistencia-${resolvedStudent.documentId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    } catch (err) {
      const errorMessage = err.response?.data?.error
        || (err.response?.data instanceof Blob ? 'Error del servidor al generar el archivo.' : null)
        || 'Error al exportar.';
      setError(errorMessage);
    }
  }, [resolvedStudent, cycleId]);

  const groupedRecords = useMemo(() => {
    return records.reduce((acc, record) => {
      const sessionName = record.sessionName || 'Sesion sin nombre';
      const sessionDate = record.sessionStartTime || record.timestamp;
      const groupKey = `${record.sessionId || 'sin-sesion'}-${sessionDate || ''}`;

      if (!acc[groupKey]) {
        acc[groupKey] = {
          sessionId: record.sessionId,
          sessionName,
          sessionDate,
          cycleName: record.cycleName || 'Sin ciclo',
          items: [],
        };
      }

      acc[groupKey].items.push(record);
      return acc;
    }, {});
  }, [records]);

  const groupList = useMemo(
    () =>
      Object.values(groupedRecords).sort(
        (a, b) => new Date(b.sessionDate || b.items?.[0]?.timestamp || 0) - new Date(a.sessionDate || a.items?.[0]?.timestamp || 0)
      ),
    [groupedRecords]
  );

  const statusByDate = useMemo(() => {
    const map = new Map();
    const priority = { ABSENT: 3, LATE: 2, PRESENT: 1 };

    records.forEach(record => {
      const dateValue = record.sessionStartTime || record.timestamp;
      if (!dateValue) return;
      const dateStr = new Date(dateValue).toISOString().slice(0, 10);
      const existing = map.get(dateStr);
      if (!existing || priority[record.status] > priority[existing.status]) {
        map.set(dateStr, { status: record.status, sessionIds: [record.sessionId] });
      } else {
        existing.sessionIds.push(record.sessionId);
      }
    });

    return map;
  }, [records]);

  const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

  const calendarMonths = useMemo(() => {
    if (!cycleDates.startDate || !cycleDates.endDate) return [];

    const start = new Date(cycleDates.startDate);
    const end = new Date(cycleDates.endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const months = [];
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);

    while (cursor <= end) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth();
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      const firstMonday = new Date(monthStart);
      const dow = firstMonday.getDay();
      firstMonday.setDate(monthStart.getDate() - (dow === 0 ? 6 : dow - 1));

      const weeks = [];
      let weekStart = new Date(firstMonday);

      while (weekStart <= monthEnd) {
        const week = [];
        for (let d = 0; d < 7; d++) {
          const cellDate = new Date(weekStart);
          cellDate.setDate(weekStart.getDate() + d);

          if (cellDate.getMonth() !== month) {
            week.push(null);
            continue;
          }

          const dateStr = cellDate.toISOString().slice(0, 10);
          const dayData = statusByDate.get(dateStr);
          const isInCycle = cellDate >= start && cellDate <= end;

          week.push({
            dateStr,
            day: cellDate.getDate(),
            abbreviation: dayData ? ({ PRESENT: 'P', LATE: 'T', ABSENT: 'F' })[dayData.status] : null,
            hasSession: !!dayData,
            sessionIds: dayData?.sessionIds || [],
            isInCycle,
          });
        }
        weeks.push(week);
        weekStart.setDate(weekStart.getDate() + 7);
      }

      months.push({
        year,
        month,
        monthName: MONTH_NAMES[month],
        monthLabel: `${MONTH_NAMES[month]} ${year}`,
        weeks,
      });

      cursor.setMonth(cursor.getMonth() + 1);
    }

    return months.reverse();
  }, [cycleDates, statusByDate]);

  const filteredGroupList = useMemo(() => {
    if (!selectedDate) return groupList;

    return groupList.filter(group => {
      const groupDate = new Date(group.sessionDate || group.items?.[0]?.timestamp || 0);
      const groupDateStr = groupDate.toISOString().slice(0, 10);
      return groupDateStr === selectedDate;
    });
  }, [groupList, selectedDate]);

  return (
    <div className={`${style.wrapper} ${embedded ? style.embedded : ''}`}>
      <div className={style.header}>
        <div>
          <h3 className={style.title}>{title}</h3>
          {resolvedStudent && (
            <p className={style.subtitle}>
              {resolvedStudent.firstName} {resolvedStudent.lastName} · DNI {resolvedStudent.documentId}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {resolvedStudent && cycleId && (
            <button className={style.exportButton} onClick={handleExport}>
              Exportar Excel
            </button>
          )}
          {onBack && (
            <button className={style.backButton} onClick={onBack}>
              &larr; Volver
            </button>
          )}
        </div>
      </div>

      {error && <div className={style.errorBox}>{error}</div>}

      {cycleId && cycleDates.startDate && calendarMonths.length > 0 && (
        <div className={style.calendarWrapper}>
          <div className={style.calendarScroll}>
            {calendarMonths.map((monthData) => (
              <div key={`${monthData.year}-${monthData.month}`} className={style.monthCard}>
                <div className={style.monthTitle}>{monthData.monthLabel}</div>
                <div className={style.weekdayRow}>
                  <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
                </div>
                {monthData.weeks.map((week, wi) => (
                  <div key={wi} className={style.weekRow}>
                    {week.map((cell, ci) => {
                      if (!cell) return <div key={ci} className={style.dayCellEmpty} />;
                      return (
                        <button
                          key={ci}
                          className={`${style.dayCellGrid} ${!cell.isInCycle ? style.outOfCycle : ''} ${cell.hasSession && cell.isInCycle ? style[`status${cell.abbreviation}`] : ''} ${selectedDate === cell.dateStr ? style.selected : ''}`}
                          onClick={() => cell.isInCycle && setSelectedDate(cell.dateStr === selectedDate ? null : cell.dateStr)}
                          title={cell.dateStr}
                          disabled={!cell.isInCycle}
                        >
                          <span className={style.dayNumber}>{cell.day}</span>
                          {cell.hasSession && cell.isInCycle && (
                            <span className={style.dayStatus}>{cell.abbreviation}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedDate && (
        <div className={style.filterIndicator}>
          <span>Mostrando sesiones del <strong>{formatLongDate(selectedDate)}</strong></span>
          <button className={style.clearFilterBtn} onClick={() => setSelectedDate(null)}>Mostrar todo</button>
        </div>
      )}

      {loading ? (
        <div className={style.emptyState}>Cargando historial...</div>
      ) : filteredGroupList.length === 0 ? (
        <div className={style.emptyState}>
          {selectedDate ? 'No hay sesiones registradas para esta fecha.' : 'No hay registros de asistencia disponibles.'}
        </div>
      ) : (
        <div className={style.groupList}>
          {filteredGroupList.map((group) => (
            <section key={`${group.sessionId}-${group.sessionDate}`} className={style.groupCard}>
              <div className={style.groupHeader}>
                <div>
                  <strong>{group.sessionName}</strong>
                  <small>{group.cycleName}</small>
                </div>
                <span className={style.groupDate}>
                  {group.sessionDate ? formatLongDate(group.sessionDate) : 'Sin fecha'}
                </span>
              </div>

              <div className={style.recordList}>
                {group.items.map((record) => (
                  <div key={record.id} className={style.recordRow}>
                    <div className={style.recordMeta}>
                      <span className={style.recordTime}>
                        {record.timestamp
                          ? new Date(record.timestamp).toLocaleTimeString('es-PE', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })
                          : '--:--:--'}
                      </span>
                    </div>
                    <span className={`${style.statusBadge} ${STATUS_CLASSNAMES[record.status] || ''}`}>
                      {STATUS_LABELS[record.status] || record.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentAttendanceHistory;
