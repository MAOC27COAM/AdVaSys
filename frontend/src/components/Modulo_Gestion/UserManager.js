import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { userService } from '../../services/userService';
import ColumnBar from './ColumnBar';
import styles from './UserManager.module.css';

const ALL_COLUMNS = [
  { header: 'Ciclo', key: 'cycleName' },
  { header: 'Modalidad', key: 'modality' },
  { header: 'Grupo', key: 'group' },
  { header: 'Turno', key: 'schedule' },
  { header: 'DNI', key: 'documentId' },
  { header: 'Nombres', key: 'firstName' },
  { header: 'Apellidos', key: 'lastName' },
  { header: 'Estado', key: 'status' },
  { header: 'Saldo / Deuda', key: 'debtLabel' },
  { header: 'Celular Estudiante', key: 'phone' },
  { header: 'Apoderado', key: 'guardianName' },
  { header: 'Celular Apoderado', key: 'guardianPhone' },
  { header: 'Colegio de Procedencia', key: 'schoolOfOrigin' },
  { header: 'Tipo de Acuerdo', key: 'agreementType' },
];

const DEFAULT_VISIBLE_KEYS = ['cycleName', 'firstName', 'lastName'];

const Paginator = ({ page, pageSize, total, onPrev, onNext }) => {
  const totalPages = Math.ceil(total / pageSize);
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  return (
    <div className={styles.paginator}>
      <span>{from}-{to} de {total}</span>
      <button onClick={onPrev} disabled={page === 0}>Anterior</button>
      <button onClick={onNext} disabled={page >= totalPages - 1}>Siguiente</button>
    </div>
  );
};

const FILTER_CONFIG = {
  modality: {
    type: 'multi',
    filterKey: 'modality',
    defaultLabel: 'Todas las modalidades',
    options: [
      { value: 'PRE_U', label: 'PRE-U' },
      { value: 'SECUNDARIA', label: 'Secundaria' },
      { value: 'PRIMERA_OPCION', label: 'Primera opcion' },
      { value: 'COAR', label: 'COAR' },
      { value: 'BECA_18', label: 'Beca 18' },
      { value: 'PRIMARIA', label: 'Primaria' },
    ],
    clearValue: [],
  },
  group: {
    type: 'multi',
    filterKey: 'group',
    defaultLabel: 'Todos los grupos',
    options: [
      { value: 'A', label: 'A' },
      { value: 'B', label: 'B' },
      { value: 'C', label: 'C' },
      { value: 'D', label: 'D' },
      { value: 'E', label: 'E' },
    ],
    clearValue: [],
  },
  schedule: {
    type: 'multi',
    filterKey: 'schedule',
    defaultLabel: 'Todos los turnos',
    options: [
      { value: 'TURNO_MANANA', label: 'Mañana' },
      { value: 'TURNO_TARDE', label: 'Tarde' },
      { value: 'TURNO_COMPLETO', label: 'Completo' },
    ],
    clearValue: [],
  },
  documentId: {
    type: 'textMulti',
    filterKey: 'documentId',
    placeholder: 'Buscar en la lista...',
    clearValue: [],
  },
  firstName: {
    type: 'textMulti',
    filterKey: 'firstName',
    placeholder: 'Buscar en la lista...',
    clearValue: [],
  },
  lastName: {
    type: 'textMulti',
    filterKey: 'lastName',
    placeholder: 'Buscar en la lista...',
    clearValue: [],
  },
  status: {
    type: 'multi',
    filterKey: 'status',
    defaultLabel: 'Todos los estados',
    options: [
      { value: 'ACTIVE', label: 'Activo' },
      { value: 'RETIRED', label: 'Retirado' },
      { value: 'OBSERVATION', label: 'Observacion' },
    ],
    clearValue: [],
  },
  debtLabel: {
    type: 'multi',
    filterKey: 'debtStatus',
    defaultLabel: 'Toda la deuda',
    headerLabel: 'Saldo / Deuda',
    options: [
      { value: 'WITH_DEBT', label: 'Con deuda' },
      { value: 'WITHOUT_DEBT', label: 'Sin deuda' },
    ],
    clearValue: [],
  },
  cycleName: {
    type: 'none',
    filterKey: null,
  },
  phone: {
    type: 'textMulti',
    filterKey: 'phone',
    placeholder: 'Buscar en la lista...',
    clearValue: [],
  },
  guardianName: {
    type: 'textMulti',
    filterKey: 'guardianName',
    placeholder: 'Buscar en la lista...',
    clearValue: [],
  },
  guardianPhone: {
    type: 'textMulti',
    filterKey: 'guardianPhone',
    placeholder: 'Buscar en la lista...',
    clearValue: [],
  },
  schoolOfOrigin: {
    type: 'textMulti',
    filterKey: 'schoolOfOrigin',
    placeholder: 'Buscar en la lista...',
    clearValue: [],
  },
  agreementType: {
    type: 'multi',
    filterKey: 'agreementType',
    defaultLabel: 'Todos los acuerdos',
    options: [
      { value: 'MONTHLY_INSTALLMENTS', label: 'Cuotas mensuales' },
      { value: 'CUSTOM_PARTS', label: 'Cuotas personalizadas' },
      { value: 'SINGLE_PAYMENT', label: 'Pago único' },
    ],
    clearValue: [],
  },
};

const AGREEMENT_TYPE_LABELS = {
  MONTHLY_INSTALLMENTS: 'Cuotas mensuales',
  CUSTOM_PARTS: 'Cuotas personalizadas',
  SINGLE_PAYMENT: 'Pago único',
};

function UserManager() {
  const { userRole, activeCycleId } = useOutletContext();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(500);
  const [filters, setFilters] = useState({
    modality: [],
    group: [],
    schedule: [],
    documentId: [],
    firstName: [],
    lastName: [],
    status: [],
    debtStatus: [],
    phone: [],
    guardianName: [],
    guardianPhone: [],
    schoolOfOrigin: [],
    agreementType: [],
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [downloadingSheet, setDownloadingSheet] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_KEYS);
  const [error, setError] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const canAccess = userRole === 'admin' || userRole === 'kami' || userRole === 'matriculador';

  const flattenFilters = useCallback((filtersObj) => {
    const params = {};
    Object.entries(filtersObj).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        const config = Object.values(FILTER_CONFIG).find((c) => c.filterKey === key);
        if (config?.type === 'textMulti') {
          params[`${key}In`] = value.join(',');
        } else {
          params[key] = value.join(',');
        }
      }
    });
    return params;
  }, []);

  const fetchUsers = useCallback(
    async (currentFilters, pageOverride = 0) => {
      if (!activeCycleId || !canAccess) {
        setUsers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const data = await userService.getUsers({
          cycleId: activeCycleId,
          skip: pageOverride * pageSize,
          take: pageSize,
          ...flattenFilters(currentFilters),
        });
        setUsers(data.rows || data);
        setTotal(data.total ?? data.length ?? 0);
      } catch (err) {
        setError(err.response?.data?.error || 'Error al cargar estudiantes.');
      } finally {
        setLoading(false);
      }
    },
    [activeCycleId, canAccess, pageSize, flattenFilters]
  );

  useEffect(() => {
    if (!activeCycleId) {
      setUsers([]);
      setLoading(false);
      return;
    }
    setPage(0);
    fetchUsers(filters, 0);
  }, [filters, activeCycleId, fetchUsers]);

  const handleFilterChange = (filterKey, value) => {
    setFilters((prev) => ({ ...prev, [filterKey]: value }));
  };

  const [availableFilterValues, setAvailableFilterValues] = useState({
    documentId: [],
    firstName: [],
    lastName: [],
    phone: [],
    guardianName: [],
    guardianPhone: [],
    schoolOfOrigin: [],
  });

  useEffect(() => {
    setAvailableFilterValues({
      documentId: [],
      firstName: [],
      lastName: [],
      phone: [],
      guardianName: [],
      guardianPhone: [],
      schoolOfOrigin: [],
    });
  }, [activeCycleId]);

  useEffect(() => {
    if (users.length > 0) {
      setAvailableFilterValues((prev) => ({
        documentId: [...new Set([...prev.documentId, ...users.map((u) => u.documentId).filter(Boolean)])],
        firstName: [...new Set([...prev.firstName, ...users.map((u) => u.firstName).filter(Boolean)])],
        lastName: [...new Set([...prev.lastName, ...users.map((u) => u.lastName).filter(Boolean)])],
        phone: [...new Set([...prev.phone, ...users.map((u) => u.phone).filter(Boolean)])],
        guardianName: [...new Set([...prev.guardianName, ...users.map((u) => u.guardianName).filter(Boolean)])],
        guardianPhone: [...new Set([...prev.guardianPhone, ...users.map((u) => u.guardianPhone).filter(Boolean)])],
        schoolOfOrigin: [...new Set([...prev.schoolOfOrigin, ...users.map((u) => u.schoolOfOrigin).filter(Boolean)])],
      }));
    }
  }, [users]);

  const rows = useMemo(
    () =>
      users.map((user) => ({
        ...user,
        debtLabel: user.debtLabel ?? (
          user.currentPendingAmount === null
            ? 'SIN ACUERDO'
            : `S/ ${Number(user.currentPendingAmount).toFixed(2)}`
        ),
      })),
    [users]
  );

  const sortedRows = useMemo(() => {
    if (!sortKey || !rows.length) return rows;
    return [...rows].sort((a, b) => {
      if (sortKey === 'debtLabel') {
        const aVal = a.currentPendingAmount ?? -1;
        const bVal = b.currentPendingAmount ?? -1;
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aVal = String(a[sortKey] ?? '');
      const bVal = String(b[sortKey] ?? '');
      const cmp = aVal.localeCompare(bVal, 'es', { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  const columnRenderers = useMemo(() => ({
    cycleName: (u) => u.cycleName,
    modality: (u) => u.modality,
    group: (u) => u.group,
    schedule: (u) => {
      const labels = { TURNO_MANANA: 'Mañana', TURNO_TARDE: 'Tarde', TURNO_COMPLETO: 'Completo' };
      return labels[u.schedule] || u.schedule || '-';
    },
    documentId: (u) => u.documentId,
    firstName: (u) => u.firstName,
    lastName: (u) => u.lastName,
    status: (u) => (
      <span
        className={`${styles.statusBadge} ${
          u.status === 'ACTIVE'
            ? styles.statusActive
            : u.status === 'RETIRED'
              ? styles.statusRetired
              : styles.statusObservation
        }`}
      >
        {u.status}
      </span>
    ),
    debtLabel: (u) => (
      <span
        className={`${styles.debtBadge} ${
          u.currentPendingAmount === null
            ? styles.debtNoAgreement
            : u.currentPendingAmount > 0
              ? styles.debtPending
              : styles.debtSettled
        }`}
      >
        {u.debtLabel}
      </span>
    ),
    phone: (u) => u.phone || '-',
    guardianName: (u) => u.guardianName || '-',
    guardianPhone: (u) => u.guardianPhone || '-',
    schoolOfOrigin: (u) => u.schoolOfOrigin || '-',
    agreementType: (u) => (u.agreementType ? AGREEMENT_TYPE_LABELS[u.agreementType] || u.agreementType : '-'),
  }), []);

  const handleExportTable = async () => {
    setExporting(true);
    setError('');
    try {
      const exportColumns = ALL_COLUMNS.filter((col) => visibleColumns.includes(col.key));
      const blob = await userService.exportUsersToExcel(
        { cycleId: activeCycleId, ...flattenFilters(filters), skip: 0, take: 1000 },
        exportColumns
      );
      const url = window.URL.createObjectURL(
        new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'estudiantes-ciclo.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al exportar la tabla');
    } finally {
      setExporting(false);
    }
  };

  const handleGenerateCards = async () => {
    if (!activeCycleId || users.length === 0) return;

    setDownloadingSheet(true);
    setError('');

    try {
      const studentIds = users.map((u) => u.userId);
      const { blob, filename } = await userService.generateCardSheet(activeCycleId, studentIds);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'No se pudo generar la plancha de carnets.');
    } finally {
      setDownloadingSheet(false);
    }
  };

  const handlePrevPage = () => {
    const newPage = Math.max(0, page - 1);
    setPage(newPage);
    fetchUsers(filters, newPage);
  };
  const handleNextPage = () => {
    const newPage = page + 1;
    setPage(newPage);
    fetchUsers(filters, newPage);
  };

  const handleDrop = (dragData, destBar, destIndex) => {
    const { columnKey, index: sourceIndex, variant: sourceBar } = dragData;

    if (sourceBar === destBar && sourceIndex === destIndex) return;

    const currentVisible = [...visibleColumns];

    if (sourceBar === 'visible' && destBar === 'hidden') {
      currentVisible.splice(sourceIndex, 1);
      setVisibleColumns(currentVisible);
    } else if (sourceBar === 'hidden' && destBar === 'visible') {
      const hiddenKeys = ALL_COLUMNS
        .filter((col) => !currentVisible.includes(col.key))
        .map((col) => col.key);
      const [moved] = hiddenKeys.splice(sourceIndex, 1);
      currentVisible.splice(destIndex, 0, moved);
      setVisibleColumns(currentVisible);
    } else if (sourceBar === 'visible' && destBar === 'visible') {
      const [moved] = currentVisible.splice(sourceIndex, 1);
      currentVisible.splice(destIndex, 0, moved);
      setVisibleColumns(currentVisible);
    } else if (sourceBar === 'hidden' && destBar === 'hidden') {
      // Reordering hidden columns has no visual effect on the table
    }
  };

  if (!canAccess) {
    return <div className={styles.accessDenied}><p>Acceso denegado.</p></div>;
  }

  if (!activeCycleId) {
    return (
      <div className={styles.userManager}>
        <div className={styles.emptyState}>Selecciona un ciclo en Matricula para ver estudiantes.</div>
      </div>
    );
  }

  const hiddenColumnKeys = ALL_COLUMNS
    .filter((col) => !visibleColumns.includes(col.key))
    .map((col) => col.key);

  return (
    <div className={styles.userManager}>
      <h2 className={styles.title}>Estudiantes del ciclo activo</h2>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.topActionsBar}>
        <button
          onClick={handleGenerateCards}
          disabled={users.length === 0 || downloadingSheet}
          className={styles.sheetButton}
        >
          {downloadingSheet ? 'Generando plancha...' : `Generar plancha carnets (${users.length})`}
        </button>
        <button onClick={handleExportTable} disabled={exporting} className={styles.exportButton}>
          {exporting ? 'Exportando...' : 'Exportar tabla'}
        </button>
      </div>

      <div className={styles.barsContainer}>
        <ColumnBar
          droppableId="hidden"
          columnKeys={hiddenColumnKeys}
          allColumns={ALL_COLUMNS}
          filterConfigs={FILTER_CONFIG}
          filterValues={filters}
          onFilterChange={handleFilterChange}
          // barLabel="Columnas ocultas"
          variant="hidden"
          onDrop={handleDrop}
          availableFilterValues={availableFilterValues}
        />
        <ColumnBar
          droppableId="visible"
          columnKeys={visibleColumns}
          allColumns={ALL_COLUMNS}
          filterConfigs={FILTER_CONFIG}
          filterValues={filters}
          onFilterChange={handleFilterChange}
          // barLabel="Columnas visibles"
          variant="visible"
          onDrop={handleDrop}
          availableFilterValues={availableFilterValues}
        />
      </div>

      {loading ? (
        <p className={styles.loadingText}>Cargando estudiantes...</p>
      ) : sortedRows.length === 0 ? (
        <div className={styles.emptyState}>
          No se encontraron estudiantes con los filtros aplicados
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.userTable}>
            <thead>
              <tr>
                <th className={styles.rowNumHeader}>#</th>
                {visibleColumns.map((key) => {
                  const col = ALL_COLUMNS.find((c) => c.key === key);
                  const isSortable = key !== 'cycleName';
                  const isActive = sortKey === key;
                  return (
                    <th
                      key={key}
                      className={isSortable ? styles.sortableHeader : undefined}
                      onClick={isSortable ? () => {
                        if (isActive) {
                          setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                        } else {
                          setSortKey(key);
                          setSortDir('asc');
                        }
                      } : undefined}
                    >
                      {col?.header || key}
                      {isActive && (
                        <span className={styles.sortIndicator}>
                          {sortDir === 'asc' ? ' ▲' : ' ▼'}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((user, idx) => (
                <tr key={user.cycleEnrollmentId}>
                  <td className={styles.rowNumCell}>{page * pageSize + idx + 1}</td>
                  {visibleColumns.map((key) => (
                    <td key={key}>{columnRenderers[key]?.(user) ?? '-'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <Paginator
            page={page}
            pageSize={pageSize}
            total={total}
            onPrev={handlePrevPage}
            onNext={handleNextPage}
          />
        </div>
      )}
    </div>
  );
}

export default UserManager;
