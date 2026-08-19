import React, { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext.js';
import { Menu, X } from 'lucide-react';
import styles from './Dashboard.module.css';

const ROLE_REDIRECTS = {
  kami: '/dashboard/matricula',
  admin: '/dashboard/matricula',
  matriculador: '/dashboard/matricula',
  student: '/dashboard/cursos',
  teacher: '/dashboard/cursos',
};

function Dashboard() {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeCycleId, setActiveCycleId] = useState(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { navigate('/login'); return; }

    const isRoot = ['/dashboard', '/dashboard/'].includes(window.location.pathname);
    if (isRoot) {
      navigate(ROLE_REDIRECTS[user.role.name] ?? '/dashboard/cursos', { replace: true });
    }
  }, [isLoading, user, navigate]);

  const handleLogout = () => { logout(); navigate('/login'); };

  if (isLoading) return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner} />
      <p>Cargando dashboard...</p>
    </div>
  );

  if (!user) return null;

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.dashboardHeader}>
        <div className={styles.headerContent}>
          <button className={styles.mobileMenuBtn} onClick={() => setIsSidebarOpen(o => !o)}>
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h1 className={styles.dashboardTitle}>Aduni Vallejo</h1>
          <div className={styles.userInfo}>
            <span>👤</span>
            <span className={`${styles.userRole} ${styles['role-' + user.role.name]}`}>
              {user.role.name}
            </span>
          </div>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Cerrar Sesión
          </button>
        </div>
      </header>

      <main className={styles.dashboardMain}>
        <Sidebar userRole={user?.role.name} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <div className={styles.dashboardContentArea}>
          <Outlet context={{ userRole: user?.role.name, activeCycleId, setActiveCycleId }} />
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
