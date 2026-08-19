import React, { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { cycleService } from '../../services/cycleService';
import { isCycleOperable } from '../../utils/cycleUtils';
import styles from './PaymentStudentDetail.module.css';

const AGREEMENT_LABELS = {
  MONTHLY_INSTALLMENTS: 'Cuotas mensuales',
  CUSTOM_PARTS: 'Cuotas personalizadas',
  SINGLE_PAYMENT: 'Pago único',
};

function PaymentStudentDetail() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { activeCycleId } = useOutletContext() || {};
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [cycleClosed, setCycleClosed] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');

  useEffect(() => {
    const loadCycle = async () => {
      if (!activeCycleId) {
        setCycleClosed(false);
        return;
      }

      try {
        const cycle = await cycleService.getCycleById(activeCycleId);
        setCycleClosed(!isCycleOperable(cycle));
      } catch (err) {
        setCycleClosed(false);
      }
    };

    loadCycle();
  }, [activeCycleId]);

  const resetMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  const normalizeDigits = (value, maxLength = null) => {
    const digits = value.replace(/\D/g, '');
    return maxLength ? digits.slice(0, maxLength) : digits;
  };

  const loadStudentData = async (dni) => {
    const [summaryData, historyData] = await Promise.all([
      paymentService.getStudentSummary(dni, activeCycleId),
      paymentService.getPaymentHistory(dni, activeCycleId),
    ]);

    setSummary(summaryData);
    setHistory(historyData);
  };

  useEffect(() => {
    if (!documentId || !activeCycleId) {
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      resetMessages();
      try {
        await loadStudentData(documentId);
      } catch (err) {
        setSummary(null);
        setHistory([]);
        setError(err.response?.data?.error || 'No se pudo cargar la información de pagos.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [documentId, activeCycleId]);

  const handleRegisterPayment = async () => {
    resetMessages();

    if (cycleClosed) {
      setError('Ciclo terminado');
      return;
    }

    if (!summary) {
      setError('No hay información del estudiante para registrar pagos.');
      return;
    }

    setLoading(true);
    try {
      const response = await paymentService.registerPayment({
        documentId: summary.documentId,
        cycleId: activeCycleId,
        amountPaid: paymentAmount,
        receiptNumber,
      });

      setSuccessMessage(response.message || 'Pago registrado correctamente.');
      setPaymentAmount('');
      setReceiptNumber('');
      await loadStudentData(summary.documentId);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo registrar el pago.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDiscount = async () => {
    resetMessages();

    if (cycleClosed) {
      setError('Ciclo terminado');
      return;
    }

    if (!summary) {
      setError('No hay información del estudiante para aplicar descuentos.');
      return;
    }

    setLoading(true);
    try {
      const response = await paymentService.registerDiscount({
        documentId: summary.documentId,
        cycleId: activeCycleId,
        discountAmount,
      });

      setSuccessMessage(response.message || 'Descuento aplicado correctamente.');
      setDiscountAmount('');
      setShowDiscount(false);
      await loadStudentData(summary.documentId);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo aplicar el descuento.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetireStudent = async () => {
    resetMessages();

    if (cycleClosed) {
      setError('Ciclo terminado');
      return;
    }

    if (!summary) {
      return;
    }

    const confirmed = window.confirm(
      `¿Deseas dar de baja a ${summary.fullName}? El estado cambiará a RETIRED.`
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    try {
      const response = await paymentService.retireStudent(summary.userId, { cycleId: activeCycleId });
      setSummary((previous) => (previous ? { ...previous, status: response.user.status } : previous));
      setSuccessMessage(response.message || 'Estudiante dado de baja correctamente.');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo dar de baja al estudiante.');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateStudent = async () => {
    resetMessages();

    if (cycleClosed) {
      setError('Ciclo terminado');
      return;
    }

    if (!summary) {
      return;
    }

    setLoading(true);
    try {
      const response = await paymentService.activateStudent(summary.userId, { cycleId: activeCycleId });
      setSummary((previous) => (previous ? { ...previous, status: response.user.status } : previous));
      setSuccessMessage(response.message || 'Estudiante activado correctamente.');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo activar al estudiante.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.detailView}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate('/dashboard/pagos')}
        >
          <ArrowLeft size={18} />
          Volver al resumen
        </button>
        <h2>Detalle de pagos</h2>
        <p>Consulta y registra pagos del alumno en el ciclo activo.</p>
      </header>

      {cycleClosed && <div className={styles.cycleClosedNotice}>Ciclo terminado</div>}

      {error && <div className={styles.error}>{error}</div>}
      {successMessage && <div className={styles.success}>{successMessage}</div>}

      {loading && !summary ? (
        <p className={styles.placeholder}>Cargando información del estudiante...</p>
      ) : (
        <div className={styles.layout}>
          <section className={styles.card}>
            <h3>Resumen del estudiante</h3>
            {summary ? (
              <>
                {summary.status === 'RETIRED' && (
                  <div className={styles.retiredNotice}>
                    El estudiante está retirado, pero se pueden seguir registrando pagos en este módulo.
                  </div>
                )}

                <div className={styles.threeColGrid}>
                  <div className={styles.col1}>
                    <div className={styles.infoItem}>
                      <strong>Nombre</strong>
                      <span>{summary.firstName}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <strong>Apellido</strong>
                      <span>{summary.lastName}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <strong>DNI</strong>
                      <span>{summary.documentId}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <strong>Estado</strong>
                      <span className={styles.statusBadge}>{summary.status}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <strong>Modalidad</strong>
                      <span>{summary.modality}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <strong>Acuerdo</strong>
                      <span>{AGREEMENT_LABELS[summary.agreementType] || summary.agreementType}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <strong>Total</strong>
                      <span>S/ {summary.totalAmount}</span>
                    </div>
                    <div className={styles.infoItem} style={{ color: '#f97316' }}>
                      <strong>Pendiente</strong>
                      <span>S/ {summary.currentPendingAmount}</span>
                    </div>
                  </div>

                  <div className={styles.col2}>
                     
                    <div className={styles.installmentsBlock}>
                      <h4>Cuotas de referencia</h4>
                      <p className={styles.installmentsNote}>
                        Las fechas de cuotas son solo referencia. El saldo operativo es el monto pendiente.
                      </p>
                      {summary.installments.length > 0 ? (
                        <table className={styles.miniTable}>
                          <thead>
                            <tr>
                              <th>Vencimiento</th>
                              <th>Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {summary.installments.map((installment) => (
                              <tr key={installment.id}>
                                <td>{new Date(installment.dueDate).toLocaleDateString()}</td>
                                <td>S/ {installment.amount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p>No hay cuotas registradas para este acuerdo.</p>
                      )}
                    </div>
                  </div>

                  <div className={styles.col3}>
                    <div className={styles.paymentBox}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(event) => setPaymentAmount(event.target.value)}
                        placeholder="Monto a pagar"
                        disabled={cycleClosed}
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength="8"
                        value={receiptNumber}
                        onChange={(event) => setReceiptNumber(normalizeDigits(event.target.value, 8))}
                        placeholder="Número de recibo (opcional)"
                        disabled={cycleClosed}
                      />
                      <div className={styles.paymentButtonsRow}>
                        <button type="button" onClick={handleRegisterPayment} disabled={loading || cycleClosed}>
                          Registrar pago
                        </button>
                        <button
                          type="button"
                          className={styles.couponButton}
                          onClick={() => setShowDiscount((prev) => !prev)}
                          disabled={loading || cycleClosed}
                        >
                          C
                        </button>
                      </div>
                      {showDiscount && (
                        <div className={styles.discountSection}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={discountAmount}
                            onChange={(event) => setDiscountAmount(event.target.value)}
                            placeholder="Monto del cupón"
                            disabled={cycleClosed}
                          />
                          <button
                            type="button"
                            className={styles.applyDiscountButton}
                            onClick={handleApplyDiscount}
                            disabled={loading || cycleClosed}
                          >
                            Aplicar descuento
                          </button>
                        </div>
                      )}
                    </div>

                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.activateButton}
                        onClick={handleActivateStudent}
                        disabled={loading || summary.status === 'ACTIVE' || cycleClosed}
                      >
                        Cambiar a ACTIVO
                      </button>
                      <button
                        type="button"
                        className={styles.retireButton}
                        onClick={handleRetireStudent}
                        disabled={loading || summary.status === 'RETIRED' || cycleClosed}
                      >
                        Dar de baja
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className={styles.placeholder}>No se encontró información de pagos para este alumno.</p>
            )}
          </section>

          <section className={styles.card}>
            <h3>Historial de pagos del alumno</h3>
            {history.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.historyTable}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Monto</th>
                      <th>Restante</th>
                      <th>Recibo</th>
                      <th>Concepto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((transaction) => {
                      const paymentDate = new Date(transaction.paidAt);
                      return (
                        <tr key={transaction.id}>
                          <td>{paymentDate.toLocaleDateString()}</td>
                          <td>{paymentDate.toLocaleTimeString()}</td>
                          <td>S/ {transaction.amountPaid}</td>
                          <td>S/ {transaction.remainingAmountAfterPayment}</td>
                          <td>
                            {transaction.paymentType === 'DISCOUNT' ? '—' : (transaction.receiptNumber || 'Sin recibo')}
                          </td>
                          <td>
                            {transaction.paymentType === 'INITIAL_PAYMENT'
                              ? 'Pago inicial'
                              : transaction.paymentType === 'DISCOUNT'
                              ? 'Cupón'
                              : 'Pago regular'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.placeholder}>No hay pagos registrados para mostrar.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default PaymentStudentDetail;
