import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { courseService } from '../../services/courseService';
import CourseCard from './CourseCard';
import CourseDetail from './CourseDetail/CourseDetail';
import CreateCourseForm from './CreateCourseForm';
import ConfirmDialog from './ConfirmDialog';
import Toast from './Toast';
import { MODALITY_LABELS } from './modalities';
import styles from './CourseModule.module.css';

const LoadingState = () => (
  <div className={styles.loadingState}>
    <span className={styles.spinner} />
    Cargando catálogo...
  </div>
);

const ErrorState = ({ message }) => (
  <div className={styles.errorState}>{message}</div>
);

const EmptyState = ({ message }) => (
  <div className={styles.emptyState}>{message || 'No hay cursos disponibles actualmente.'}</div>
);

function CourseModule() {
  const { userRole } = useOutletContext();
  const navigate = useNavigate();
  const { courseId } = useParams();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalityFilter, setModalityFilter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const activeCourseId = courseId ? Number(courseId) : null;
  const isValidCourseId = Number.isInteger(activeCourseId) && activeCourseId > 0;

  const isPrivilegedUser = ['admin', 'matriculador', 'kami', 'teacher'].includes(userRole);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await courseService.getAllCourses();
      setCourses(response || []);
    } catch (err) {
      console.error('Error en fetchCourses:', err);
      setError(
        err.response?.status === 401
          ? 'Sesión expirada. Por favor inicia sesión nuevamente.'
          : 'Error al cargar los cursos. Intenta más tarde.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesSearch =
        !q ||
        course.title.toLowerCase().includes(q) ||
        (course.description || '').toLowerCase().includes(q);

      const modalities = Array.isArray(course.allowedModalities)
        ? course.allowedModalities
            .map((item) => (typeof item === 'string' ? item : item?.modality))
            .filter(Boolean)
        : [];
      const matchesModality = !modalityFilter || modalities.includes(modalityFilter);

      return matchesSearch && matchesModality;
    });
  }, [courses, searchQuery, modalityFilter]);

  const handleCreationSuccess = useCallback(() => {
    setShowCreateForm(false);
    setCourseToEdit(null);
    fetchCourses();
    setToast({ type: 'success', message: 'Curso guardado correctamente.' });
  }, [fetchCourses]);

  const handleOpenForm = useCallback(() => setShowCreateForm(true), []);

  const handleEditCourse = useCallback((course) => {
    setCourseToEdit(course);
    setShowCreateForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowCreateForm(false);
    setCourseToEdit(null);
  }, []);

  const handleSelectCourse = useCallback(
    (id) => navigate(`/dashboard/cursos/${id}`),
    [navigate]
  );

  const handleBack = useCallback(() => navigate('/dashboard/cursos'), [navigate]);

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmDelete) return;
    try {
      await courseService.deleteCourse(confirmDelete);
      setCourses((prev) => prev.filter((c) => c.id !== confirmDelete));
      setToast({ type: 'success', message: 'Curso eliminado correctamente.' });
    } catch (error) {
      console.error(error);
      setToast({ type: 'error', message: 'Error al eliminar el curso.' });
    } finally {
      setConfirmDelete(null);
    }
  }, [confirmDelete]);

  if (isValidCourseId) {
    return (
      <CourseDetail
        courseId={activeCourseId}
        userRole={userRole}
        onBack={handleBack}
      />
    );
  }

  const renderContent = () => {
    if (loading) return <LoadingState />;
    if (error) return <ErrorState message={error} />;

    const showFilters = courses.length > 0;

    return (
      <>
        {showFilters && (
          <div className={styles.filters}>
            <input
              className={styles.searchInput}
              type="search"
              placeholder="Buscar curso por título o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Buscar cursos"
            />
            {isPrivilegedUser && (
              <div className={styles.modalityPills}>
                {Object.entries(MODALITY_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.pill} ${modalityFilter === key ? styles.pillActive : ''}`}
                    onClick={() =>
                      setModalityFilter((current) => (current === key ? '' : key))
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {filteredCourses.length > 0 ? (
          <div className={styles.courseGrid}>
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                userRole={userRole}
                onViewDetails={() => handleSelectCourse(course.id)}
                onEdit={handleEditCourse}
                onDelete={setConfirmDelete}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            message={
              courses.length > 0
                ? 'No se encontraron cursos con los filtros aplicados.'
                : 'No hay cursos disponibles actualmente.'
            }
          />
        )}
      </>
    );
  };

  const shownCount = filteredCourses.length;
  const totalCount = courses.length;

  return (
    <div className={styles.moduleContainer}>
      <header className={styles.moduleHeader}>
        <div>
          <h2 className={styles.moduleTitle}>Material de Cursos</h2>
          <p className={styles.moduleSubtitle}>
            {totalCount > 0
              ? `${shownCount} de ${totalCount} curso${totalCount !== 1 ? 's' : ''}`
              : 'Explora nuestro contenido educativo'}
          </p>
        </div>

        {isPrivilegedUser && !loading && (
          <button className={styles.createBtn} onClick={handleOpenForm} type="button">
            + Crear Curso
          </button>
        )}
      </header>

      <div className={styles.moduleContent}>{renderContent()}</div>

      {showCreateForm && (
        <div className={styles.modalOverlay} onClick={handleCloseForm}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <CreateCourseForm
              onClose={handleCloseForm}
              onSuccess={handleCreationSuccess}
              courseToEdit={courseToEdit}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar curso"
        message="¿Seguro que quieres eliminar este curso? También se borrarán sus materiales."
        confirmLabel="Eliminar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      <Toast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />
    </div>
  );
}

export default CourseModule;