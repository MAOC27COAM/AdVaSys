import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { studentService } from '../../services/studentService';
import styles from './BulkEnrollmentModal.module.css';

const STATUS_LABELS = {
  VALID: 'Valido',
  RECURRENT: 'Recurrente',
  ERROR: 'Error',
  IMPORTED: 'Importado',
};

const SUMMARY_LABELS = {
  totalRows: 'Total filas',
  validRows: 'Filas validas',
  errorRows: 'Filas con error',
  newStudents: 'Nuevos',
  recurrentStudents: 'Recurrentes',
  processed: 'Procesadas',
  imported: 'Importadas',
  failed: 'Fallidas',
  recurrentImported: 'Recurrentes importados',
};

function BulkEnrollmentModal({ cycleId, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState(null);
  const [commitResult, setCommitResult] = useState(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const validRows = useMemo(
    () => preview?.rows?.filter((row) => row.status === 'VALID' || row.status === 'RECURRENT') || [],
    [preview]
  );

  const handlePreview = async () => {
    if (!file) {
      setError('Seleccione un archivo Excel para continuar.');
      return;
    }

    setLoadingPreview(true);
    setError(null);
    setCommitResult(null);

    try {
      const response = await studentService.previewBulkEnrollment(cycleId, file);
      setPreview(response);
    } catch (err) {
      setPreview(null);
      setError(err.response?.data?.error || 'No se pudo analizar el archivo Excel.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleCommit = async () => {
    if (validRows.length === 0) {
      setError('No hay filas validas para importar.');
      return;
    }

    setCommitting(true);
    setError(null);

    try {
      const result = await studentService.commitBulkEnrollment(cycleId, validRows);
      setCommitResult(result);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo completar la importacion masiva.');
    } finally {
      setCommitting(false);
    }
  };

  const renderRows = commitResult?.rows || preview?.rows || [];

  const modalContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>Importar estudiantes desde Excel</h3>
            <p className={styles.subtitle}>Sube el archivo, revisa la vista previa y confirma la matricula masiva.</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar modal">
            ×
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.uploadCard}>
            <label className={styles.fileInputLabel}>
              <span>{file ? file.name : 'Seleccionar archivo Excel (.xlsx o .xls)'}</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] || null;
                  setFile(nextFile);
                  setPreview(null);
                  setCommitResult(null);
                  setError(null);
                }}
              />
            </label>

            <button
              type="button"
              className={styles.primaryButton}
              onClick={handlePreview}
              disabled={!file || loadingPreview || committing}
            >
              {loadingPreview ? 'Validando archivo...' : 'Validar archivo'}
            </button>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          {(preview || commitResult) && (
            <>
              <div className={styles.summaryGrid}>
                {Object.entries((commitResult || preview).summary).map(([key, value]) => (
                  <div key={key} className={styles.summaryCard}>
                    <span className={styles.summaryLabel}>{SUMMARY_LABELS[key] || key}</span>
                    <strong className={styles.summaryValue}>{value}</strong>
                  </div>
                ))}
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>Fila</th>
                      <th>Estado</th>
                      <th>Tipo</th>
                      <th>Mensaje</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderRows.map((row) => (
                      <tr key={`${row.rowNumber}-${row.status}`}>
                        <td>{row.rowNumber}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles[`status${row.status}`] || ''}`}>
                            {STATUS_LABELS[row.status] || row.status}
                          </span>
                        </td>
                        <td>{row.studentType || '-'}</td>
                        <td>{row.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Cerrar
          </button>
          <button
            type="button"
            className={styles.commitButton}
            onClick={handleCommit}
            disabled={!preview || validRows.length === 0 || committing}
          >
            {committing ? 'Importando...' : `Confirmar importacion (${validRows.length})`}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default BulkEnrollmentModal;
