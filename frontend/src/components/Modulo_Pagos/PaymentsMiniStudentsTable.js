import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../services/userService';
import styles from './PaymentsMiniStudentsTable.module.css';

const MODALITY_LABELS = {
  PRE_U: 'PRE U',
  BECA_18: 'BECA 18',
  SECUNDARIA: 'SECUNDARIA',
  PRIMARIA: 'PRIMARIA',
  COAR: 'COAR',
  PRIMERA_OPCION: '1RA OPCIÓN',
};

const COLUMNS = [
  { header: 'DNI', key: 'documentId' },
  { header: 'Nombres', key: 'firstName' },
  { header: 'Apellidos', key: 'lastName' },
  //{ header: 'Modalidad', key: 'modality' },
  //{ header: 'Estado', key: 'status' },
  { header: 'Saldo / Deuda', key: 'debtLabel' },
];

function PaymentsMiniStudentsTable({ cycleId }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalityFilter, setModalityFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [availableModalities, setAvailableModalities] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);

  const fetchUsers = useCallback(async () => {
    if (!cycleId) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const params = { cycleId, debtStatus: 'WITH_DEBT' };
      if (modalityFilter) params.modality = modalityFilter;
      if (groupFilter) params.group = groupFilter;
      const data = await userService.getUsers(params);
      setUsers(data.rows || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar estudiantes.');
    } finally {
      setLoading(false);
    }
  }, [cycleId, modalityFilter, groupFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (!cycleId) return;

    userService.getCycleFilters(cycleId).then((data) => {
      setAvailableModalities(data.modalities || []);
      setAvailableGroups(data.groups || []);
    }).catch(() => {});
  }, [cycleId]);

  const handleRowClick = (documentId) => {
    navigate(`/dashboard/pagos/alumno/${documentId}`);
  };

  return (
    <section className={styles.card}>
      <h3>Estudiantes del ciclo</h3>
      <p className={styles.miniTableNote}>Vista resumida. Haz clic en una fila para ver el detalle de pagos.</p>

      <div className={styles.filtersRow}>
        <select
          className={styles.filterSelect}
          value={modalityFilter}
          onChange={(event) => setModalityFilter(event.target.value)}
        >
          <option value="">Todas las modalidades</option>
          {availableModalities.map((m) => (
            <option key={m} value={m}>{MODALITY_LABELS[m] || m}</option>
          ))}
        </select>

        <select
          className={styles.filterSelect}
          value={groupFilter}
          onChange={(event) => setGroupFilter(event.target.value)}
        >
          <option value="">Todos los grupos</option>
          {availableGroups.map((g) => (
            <option key={g} value={g}>Grupo {g}</option>
          ))}
        </select>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p className={styles.placeholder}>Cargando estudiantes...</p>
      ) : users.length === 0 ? (
        <p className={styles.placeholder}>No hay estudiantes deudores en este ciclo.</p>
      ) : (
        <div className={styles.miniTableWrapper}>
          <table className={styles.miniStudentsTable}>
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <th key={column.key}>{column.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.userId}
                  className={styles.miniTableRow}
                  onClick={() => handleRowClick(user.documentId)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleRowClick(user.documentId);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                >
                  {COLUMNS.map((column) => (
                    <td key={column.key}>{user[column.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default PaymentsMiniStudentsTable;
