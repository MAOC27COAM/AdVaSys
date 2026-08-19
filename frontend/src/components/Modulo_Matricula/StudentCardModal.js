import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { studentService } from '../../services/studentService';
import styles from './StudentCardModal.module.css';

const MODALITY_LABELS = {
  PRE_U: 'PRE-U',
  SECUNDARIA: 'Secundaria',
  PRIMERA_OPCION: 'Primera opcion',
  COAR: 'COAR',
  BECA_18: 'Beca 18',
  PRIMARIA: 'Primaria',
};

const SCHEDULE_LABELS = {
  TURNO_MANANA: 'Turno manana',
  TURNO_TARDE: 'Turno tarde',
  TURNO_COMPLETO: 'Turno completo',
};

const STATUS_LABELS = {
  ACTIVE: 'Activo',
  RETIRED: 'Retirado',
  OBSERVATION: 'Observacion',
};

function StudentCardModal({ studentId, cycleId, onClose }) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    const loadStudent = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await studentService.getStudentById(studentId, cycleId);
        setStudent(response);
      } catch (err) {
        setError(err.response?.data?.error || 'No se pudo cargar la informacion del estudiante.');
      } finally {
        setLoading(false);
      }
    };

    loadStudent();
  }, [studentId, cycleId]);

  const summary = useMemo(() => {
    if (!student) {
      return [];
    }

    return [
      { label: 'DNI', value: student.documentId || 'No registrado' },
      { label: 'Celular', value: student.phone || 'No registrado' },
      { label: 'Correo', value: student.email || 'No registrado' },
      { label: 'Direccion', value: student.address || 'No registrada' },
      {
        label: 'Modalidad',
        value: MODALITY_LABELS[student.studentProfile?.modality] || student.studentProfile?.modality || 'No registrada',
      },
      {
        label: 'Grupo',
        value: student.studentProfile?.group || 'No registrado',
      },
      {
        label: 'Turno',
        value: SCHEDULE_LABELS[student.studentProfile?.schedule] || student.studentProfile?.schedule || 'No registrado',
      },
      {
        label: 'Ciclo',
        value: student.cycleEnrollment?.cycle?.name || 'No registrado',
      },
      {
        label: 'Estado',
        value: STATUS_LABELS[student.status] || student.status || 'No registrado',
      },
      {
        label: 'Colegio',
        value: student.studentProfile?.schoolOfOrigin || 'No registrado',
      },
      {
        label: 'Apoderado',
        value: student.studentProfile?.guardianName || 'No registrado',
      },
      {
        label: 'Celular apoderado',
        value: student.studentProfile?.guardianPhone || 'No registrado',
      },
    ];
  }, [student]);

  const handleDownloadSheet = async () => {
    setDownloading(true);
    setError(null);

    try {
      const { blob, filename } = await studentService.generateAcademicCardSheet(cycleId, [studentId]);
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      if (err.response?.data instanceof Blob) {
        try {
          const payload = JSON.parse(await err.response.data.text());
          setError(payload.error || 'No se pudo generar la plancha A4.');
        } catch {
          setError('No se pudo generar la plancha A4.');
        }
      } else {
        setError(err.response?.data?.error || 'No se pudo generar la plancha A4.');
      }
    } finally {
      setDownloading(false);
    }
  };

  const modalContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>Detalle del estudiante</h3>
            <p className={styles.subtitle}>Revisa los datos del alumno antes de generar la plancha A4 individual.</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar modal">
            ×
          </button>
        </div>

        {loading ? (
          <div className={styles.stateBox}>Cargando informacion del estudiante...</div>
        ) : error && !student ? (
          <div className={`${styles.stateBox} ${styles.errorBox}`}>{error}</div>
        ) : (
          <>
            <div className={styles.hero}>
              <div className={styles.photoFrame}>
                {student?.profilePictureUrl ? (
                  <img
                    src={student.profilePictureUrl}
                    alt={`Perfil de ${student.firstName} ${student.lastName}`}
                    className={styles.photo}
                  />
                ) : (
                  <div className={styles.photoPlaceholder}>Sin foto</div>
                )}
              </div>

              <div className={styles.identityBlock}>
                <span className={styles.kicker}>Alumno seleccionado</span>
                <h4 className={styles.name}>{student?.firstName} {student?.lastName}</h4>
                <p className={styles.identityText}>
                  Plancha A4 de un solo estudiante, con frente y reverso en tamano real.
                </p>
              </div>
            </div>

            <div className={styles.grid}>
              {summary.map((item) => (
                <div key={item.label} className={styles.fieldCard}>
                  <span className={styles.fieldLabel}>{item.label}</span>
                  <span className={styles.fieldValue}>{item.value}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className={`${styles.stateBox} ${styles.errorBox}`}>{error}</div>
            )}

            <div className={styles.actions}>
              <button type="button" className={styles.secondaryButton} onClick={onClose}>
                Cerrar
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleDownloadSheet}
                disabled={downloading}
              >
                {downloading ? 'Generando plancha A4...' : 'Generar plancha A4'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default StudentCardModal;
