import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { userService } from '../../services/userService';
import AdminUserForm from './AdminUserForm';
import styles from './AdminUserManager.module.css';

const ROLE_LABELS = {
  admin: 'Administrador',
  teacher: 'Profesor',
  matriculador: 'Matriculador',
};

const STATUS_LABELS = {
  ACTIVE: 'Activo',
  RETIRED: 'Dado de baja',
  OBSERVATION: 'Observación',
};

function AdminUserManager() {
  const { userRole } = useOutletContext();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const canAccess = userRole === 'admin' || userRole === 'kami' || userRole === 'matriculador';

  const fetchUsers = useCallback(async (searchTerm = '') => {
    setLoading(true);
    setError('');
    try {
      const data = await userService.getAdminUsers(searchTerm ? { search: searchTerm } : {});
      setUsers(data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar los usuarios.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canAccess) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [canAccess, fetchUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(search);
  };

  const handleDeactivate = async (user) => {
    const confirmed = window.confirm(
      `¿Estas seguro de dar de baja al usuario "${user.username}" (${user.firstName} ${user.lastName})?\nEsta accion deshabilitara su acceso al sistema.`
    );
    if (!confirmed) return;

    setError('');
    try {
      await userService.deactivateUser(user.id);
      fetchUsers(search);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo dar de baja al usuario.');
    }
  };

  if (!canAccess) {
    return <div className={styles.accessDenied}><p>Acceso denegado.</p></div>;
  }

  return (
    <div className={styles.adminUserManager}>
      <h2 className={styles.title}>Gestion de usuarios administrativos</h2>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <div className={styles.topActionsBar}>
        <button onClick={() => navigate('/dashboard/usuarios')} className={styles.backButton}>
          ← Volver a Usuarios
        </button>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por DNI, nombre o usuario..."
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>Buscar</button>
        </form>
        <button onClick={() => setShowForm(true)} className={styles.registerButton}>
          + Registrar nuevo usuario
        </button>
      </div>

      {loading ? (
        <p className={styles.loadingText}>Cargando usuarios...</p>
      ) : users.length === 0 ? (
        <div className={styles.emptyState}>
          No se encontraron usuarios con los roles admin, profesor o matriculador.
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.userTable}>
            <thead>
              <tr>
                <th className={styles.rowNumHeader}>#</th>
                <th>DNI</th>
                <th>Nombres</th>
                <th>Apellidos</th>
                <th>Nombre Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <tr key={user.id}>
                  <td className={styles.rowNumCell}>{idx + 1}</td>
                  <td>{user.documentId}</td>
                  <td>{user.firstName}</td>
                  <td>{user.lastName}</td>
                  <td>{user.username}</td>
                  <td>
                    <span className={styles.roleBadge}>{ROLE_LABELS[user.roleName] || user.roleName}</span>
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${
                        user.status === 'ACTIVE'
                          ? styles.statusActive
                          : user.status === 'RETIRED'
                            ? styles.statusRetired
                            : styles.statusObservation
                      }`}
                    >
                      {STATUS_LABELS[user.status] || user.status}
                    </span>
                  </td>
                  <td>
                    {user.status === 'ACTIVE' ? (
                      <button
                        onClick={() => handleDeactivate(user)}
                        className={styles.deactivateButton}
                      >
                        Dar de baja
                      </button>
                    ) : (
                      <span className={styles.inactiveLabel}>Sin acciones</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <AdminUserForm
          onClose={() => setShowForm(false)}
          onSuccess={() => fetchUsers(search)}
        />
      )}
    </div>
  );
}

export default AdminUserManager;