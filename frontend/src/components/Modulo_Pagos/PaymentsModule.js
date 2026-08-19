import React from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import styles from './PaymentsModule.module.css';

function PaymentsModule() {
  const outletContext = useOutletContext() || {};
  const { userRole, activeCycleId } = outletContext;
  const allowed = userRole === 'admin' || userRole === 'matriculador';

  if (!allowed) {
    return <div className={styles.accessDenied}>Acceso denegado al módulo Pagos.</div>;
  }

  if (!activeCycleId) {
    return (
      <div className={styles.paymentsModule}>
        <div className={styles.notice}>Selecciona un ciclo en Matrícula para trabajar con pagos.</div>
      </div>
    );
  }

  return (
    <div className={styles.paymentsModule}>
      <Outlet context={outletContext} />
    </div>
  );
}

export default PaymentsModule;
