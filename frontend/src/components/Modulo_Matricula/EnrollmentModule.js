import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { studentService } from '../../services/studentService';
import { cycleService } from '../../services/cycleService';
import { isCycleOperable } from '../../utils/cycleUtils';
import StudentTable from './StudentTable';
import StudentSearchBar from './StudentSearchBar';
import EnrollmentForm from './EnrollmentForm';
import CycleManager from './CycleManager';
import StudentCardModal from './StudentCardModal';
import BulkEnrollmentModal from './BulkEnrollmentModal';
import styles from './EnrollmentModule.module.css';

function EnrollmentModule() {
  const { userRole, activeCycleId, setActiveCycleId } = useOutletContext();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [showBulkEnrollmentModal, setShowBulkEnrollmentModal] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState(null);
  const [studentToView, setStudentToView] = useState(null);
  const [downloadingSheet, setDownloadingSheet] = useState(false);
  const [cycleClosed, setCycleClosed] = useState(false);

  const isMatriculadorOrAdmin = userRole === 'admin' || userRole === 'matriculador' || userRole === 'kami';

  const fetchStudents = useCallback(async (query = '', cycleId) => {
    if (!cycleId || !isMatriculadorOrAdmin) {
      setStudents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const filters = { cycleId, q: query, roleName: 'students' };
      const response = await studentService.getstudentMatriculados(filters);
      setStudents(response);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar la lista de estudiantes.');
    } finally {
      setLoading(false);
    }
  }, [isMatriculadorOrAdmin]);

  useEffect(() => {
    fetchStudents(searchTerm, activeCycleId);
  }, [activeCycleId, searchTerm, fetchStudents]);

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

  const handleSearch = (query) => setSearchTerm(query);

  const handleEdit = (student) => {
    if (cycleClosed) {
      setError('Ciclo terminado');
      return;
    }

    setStudentToEdit(student);
    setShowEnrollmentForm(true);
  };

  const handleEnrollmentSuccess = () => {
    setShowEnrollmentForm(false);
    setStudentToEdit(null);
    fetchStudents(searchTerm, activeCycleId);
  };

  const handleViewStudent = (student) => {
    setStudentToView(student);
  };

  const handleCycleSelected = (cycleId) => {
    setActiveCycleId(cycleId);
    setSearchTerm('');
    setError(null);
  };

  const handleDownloadSheet = async () => {
    if (!activeCycleId || students.length === 0) {
      return;
    }

    setDownloadingSheet(true);
    setError(null);

    try {
      const studentIds = students.map((student) => student.id);
      const { blob, filename } = await studentService.generateAcademicCardSheet(activeCycleId, studentIds);
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
      setDownloadingSheet(false);
    }
  };

  const handleBulkEnrollmentSuccess = () => {
    fetchStudents(searchTerm, activeCycleId);
  };

  if (!isMatriculadorOrAdmin) {
    return <div className={styles.noAccess}><h3>Acceso Denegado en el modulo matricula</h3></div>;
  }

  return (
    <div className={styles.enrollmentModuleContainer}>
      <header className={styles.moduleHeader}>
        <h2 className={styles.pageTitle}>Estudiantes matriculados</h2>

        <div className={styles.cycleSelectorWrapper}>
          <CycleManager onCycleSelected={handleCycleSelected} activeCycleId={activeCycleId} />
        </div>
      </header>

      {activeCycleId ? (
        <div className={styles.studentTableCard}>
          <div className={styles.tableControlsBar}>
            <div className={styles.searchBarWrapper}>
              <StudentSearchBar onSearch={handleSearch} />
            </div>

            <button
              className={`${styles.enrollStudentButton} btn btn-primary`}
              disabled={cycleClosed}
              onClick={() => {
                if (cycleClosed) {
                  setError('Ciclo terminado');
                  return;
                }
                setStudentToEdit(null);
                setShowEnrollmentForm(true);
              }}
            >
              Matricular Nuevo Estudiante
            </button>
          </div>

          {cycleClosed && (
            <div className={styles.cycleClosedNotice}>
              Ciclo terminado
            </div>
          )}

          <div className={styles.tableContent}>
            {loading ? (
              <div className={styles.enrollmentLoading}>Cargando estudiantes...</div>
            ) : error ? (
              <div className={`${styles.enrollmentError} alert alert-error`}>Error: {error}</div>
            ) : students.length === 0 ? (
              <div className={styles.noStudents}>No se encontraron estudiantes matriculados en este ciclo.</div>
            ) : (
              <StudentTable
                students={students}
                onEdit={handleEdit}
                onView={handleViewStudent}
              />
            )}
          </div>

          <div className={styles.bottomActionsBar}>
            <div className={styles.bottomActionsGroup}>
              {/* <button
                className={styles.sheetButton}
                disabled={students.length === 0 || downloadingSheet}
                onClick={handleDownloadSheet}
              >
                {downloadingSheet ? 'Generando plancha A4...' : `Generar plancha A4 de la lista (${students.length})`}
              </button> */}

              {/* <button
                className={styles.importButton}
                disabled={cycleClosed}
                onClick={() => {
                  if (cycleClosed) {
                    setError('Ciclo terminado');
                    return;
                  }

                  setShowBulkEnrollmentModal(true);
                }}
              >
                Importar Excel
              </button> */}
            </div>
          </div>

          <h4 className={styles.tableFooterTitle}>LISTA DE ESTUDIANTES</h4>
          <button
                className={styles.importButton2}
                disabled={cycleClosed}
                onClick={() => {
                  if (cycleClosed) {
                    setError('Ciclo terminado');
                    return;
                  }

                  setShowBulkEnrollmentModal(true);
                }}
              >
                Importar Excel
              </button>
        </div>
      ) : (
        <div className={styles.noCycleSelected}>
          <p>Por favor, selecciona un ciclo para ver los estudiantes.</p>
        </div>
      )}

      {showEnrollmentForm && activeCycleId && (
        <EnrollmentForm
          onClose={() => {
            setShowEnrollmentForm(false);
            setStudentToEdit(null);
          }}
          onSuccess={handleEnrollmentSuccess}
          cycleId={activeCycleId}
          cycleClosed={cycleClosed}
          studentData={studentToEdit}
        />
      )}

      {studentToView && activeCycleId && (
        <StudentCardModal
          studentId={studentToView.id}
          cycleId={activeCycleId}
          onClose={() => setStudentToView(null)}
        />
      )}

      {showBulkEnrollmentModal && activeCycleId && (
        <BulkEnrollmentModal
          cycleId={activeCycleId}
          onClose={() => setShowBulkEnrollmentModal(false)}
          onSuccess={handleBulkEnrollmentSuccess}
        />
      )}
    </div>
  );
}

export default EnrollmentModule;
