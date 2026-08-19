import React, { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import PaymentSearchAutocomplete from './PaymentSearchAutocomplete';
import PaymentsMiniStudentsTable from './PaymentsMiniStudentsTable';
import styles from './PaymentDashboard.module.css';

const PAYMENT_TYPE_LABELS = {
  INITIAL_PAYMENT: 'Pago inicial',
  REGULAR_PAYMENT: 'Pago regular',
  DISCOUNT: 'Cupón',
};

function PaymentDashboard() {
  const { activeCycleId } = useOutletContext() || {};
  const [summary, setSummary] = useState(null);
  const [historyDays, setHistoryDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);

  const loadDashboardData = useCallback(async () => {
    if (!activeCycleId) {
      setSummary(null);
      setHistoryDays([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [summaryData, historyData] = await Promise.all([
        paymentService.getCycleSummary(activeCycleId),
        paymentService.getCycleHistory(activeCycleId),
      ]);
      setSummary(summaryData);
      setHistoryDays(historyData.days || []);
    } catch (err) {
      setSummary(null);
      setHistoryDays([]);
      setError(err.response?.data?.error || 'No se pudo cargar el resumen de pagos.');
    } finally {
      setLoading(false);
    }
  }, [activeCycleId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const fmt = (value) => `S/ ${Number(value).toFixed(2)}`;

  const indicatorItems = summary
    ? [
        {
          category: 'Activos',
          sub: 'Total a pagar',
          count: summary.activeStudentsCount,
          amount: fmt(summary.activeStudentsTotalToPay),
        },
        {
          category: 'Activos',
          sub: 'Total pagado',
          count: summary.activeStudentsCount,
          amount: fmt(summary.activeStudentsTotalPaid),
        },
        {
          category: 'Dados de baja',
          sub: 'Total a pagar',
          count: summary.retiredStudentsCount,
          amount: fmt(summary.retiredStudentsTotalToPay),
        },
        {
          category: 'Dados de baja',
          sub: 'Total pagado',
          count: summary.retiredStudentsCount,
          amount: fmt(summary.retiredStudentsTotalPaid),
        },
        {
          category: 'Sin deuda',
          sub: 'Total pagado',
          count: summary.noDebtStudentsCount,
          amount: fmt(summary.noDebtStudentsTotalPaid),
        },
        {
          category: 'Con deuda',
          sub: 'Total a pagar',
          count: summary.withDebtStudentsCount,
          amount: fmt(summary.withDebtStudentsTotalToPay),
        },
        {
          category: 'Cupones',
          sub: 'Total descontado',
          count: summary.studentsWithDiscountCount,
          amount: fmt(summary.totalDiscountAmount),
        },
      ]
    : [];

  return (
    <>
      <header className={styles.header}>
        <h2>Pagos</h2>
        <p>Resumen del ciclo activo, búsqueda de alumnos e historial general de pagos.</p>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p className={styles.placeholder}>Cargando resumen del ciclo...</p>
      ) : (
        <>
          {summary && (
            <section className={styles.indicatorsSection}>
              <button
                type="button"
                className={styles.indicatorToggle}
                onClick={() => setIndicatorsOpen((prev) => !prev)}
                aria-expanded={indicatorsOpen}
              >
                {indicatorsOpen ? <ChevronDown size={22} /> : <ChevronRight size={22} />}
                <span>Indicadores del ciclo</span>
              </button>

              <div
                className={`${styles.indicatorsBody} ${indicatorsOpen ? styles.indicatorsOpen : ''}`}
              >
                <div className={styles.indicatorCards}>
                  {indicatorItems.map((item, idx) => (
                    <div key={idx} className={styles.indicatorCard}>
                      <span className={styles.indicatorCardHeader}>
                        <span className={styles.indicatorCategory}>{item.category}</span>
                        <span className={styles.indicatorCount}>{item.count}</span>
                      </span>
                      <span className={styles.indicatorSub}>{item.sub}</span>
                      <span className={styles.indicatorAmount}>{item.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <div className={styles.dashboardLayout}>
            <div className={styles.leftColumn}>
              <section className={styles.searchSection}>
                <PaymentSearchAutocomplete cycleId={activeCycleId} />
              </section>

              <PaymentsMiniStudentsTable cycleId={activeCycleId} />
            </div>

            <div className={styles.rightColumn}>
              <section className={styles.card}>
                <h3>Historial general de pagos</h3>
                {historyDays.length === 0 ? (
                  <p className={styles.placeholder}>No hay pagos registrados en este ciclo.</p>
                ) : (
                  <div className={styles.historyByDay}>
                    {historyDays.map((day) => (
                      <article key={day.date} className={styles.historyDayBlock}>
                        <header className={styles.historyDayHeader}>
                          <div>
                            <h4>{day.displayDate}</h4>
                            <span className={styles.historyDayMeta}>{day.date}</span>
                          </div>
                          <strong className={styles.historyDaySubtotal}>
                            Subtotal: S/ {Number(day.subtotal).toFixed(2)}
                          </strong>
                        </header>

                        <div className={styles.tableWrapper}>
                          <table className={styles.historyTable}>
                            <thead>
                              <tr>
                                <th>Hora</th>
                                <th>Alumno</th>
                                <th>DNI</th>
                                <th>Monto</th>
                                <th>Restante</th>
                                <th>Recibo</th>
                                <th>Tipo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {day.transactions.map((transaction) => (
                                <tr key={transaction.id}>
                                  <td>{transaction.timeLabel}</td>
                                  <td>{transaction.studentName}</td>
                                  <td>{transaction.documentId}</td>
                                  <td>S/ {transaction.amountPaid}</td>
                                  <td>S/ {transaction.remainingAmountAfterPayment}</td>
                                  <td>{transaction.receiptNumber || 'Sin recibo'}</td>
                                  <td>
                                    {PAYMENT_TYPE_LABELS[transaction.paymentType] || transaction.paymentType}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default PaymentDashboard;
