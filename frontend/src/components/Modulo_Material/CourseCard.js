import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import styles from './CourseCard.module.css';
import {
  MODALITY_SHORT_LABELS,
  MODALITY_COLORS,
  getAllowedModalities,
} from './modalities';

// 1. Añadimos 'onViewDetails' a las props
function CourseCard({ course, userRole, onViewDetails, onEdit, onDelete }) {
  const [imageError, setImageError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const canEdit = useMemo(() => 
    userRole === 'admin' || userRole === 'matriculador' || userRole === 'kami' || userRole === 'teacher', 
  [userRole]);

  const formattedDate = useMemo(() => {
    if (!course.createdAt) return null;
    return new Date(course.createdAt).toLocaleDateString();
  }, [course.createdAt]);

  const modalities = useMemo(() => getAllowedModalities(course), [course]);
  const primaryModality = modalities[0];
  const extraCount = modalities.length - 1;
  const modalityColor = useMemo(
    () => MODALITY_COLORS[primaryModality] || '#6b7280',
    [primaryModality]
  );

  const displayDescription = useMemo(() => {
    if (!course.description) return '';
    if (expanded || course.description.length <= 120) return course.description;
    return `${course.description.substring(0, 120)}...`;
  }, [course.description, expanded]);

  const needsExpansion = course.description && course.description.length > 120;

  const handleImageError = () => setImageError(true);
  const toggleExpanded = (e) => { 
    e.stopPropagation(); // Evita que al expandir también se entre al curso
    setExpanded(!expanded); 
  };
  
  // 2. Función para manejar la navegación
  const handleAction = (e) => {
    e.stopPropagation(); // Evita conflictos de clics
    if (onViewDetails) onViewDetails(course.id);
  };

  return (
    <article className={styles.courseCard} onClick={handleAction}>
      <div className={styles.courseCardImage}>
        {course.imageUrl && !imageError ? (
          <img 
            src={course.imageUrl} 
            alt={`Portada de ${course.title}`} 
            onError={handleImageError} 
            loading="lazy" 
          />
        ) : (
          <div className={styles.courseCardPlaceholder}><span>📚</span></div>
        )}
        {primaryModality && (
          <div className={styles.modalityBadge} style={{ backgroundColor: modalityColor }}>
            {MODALITY_SHORT_LABELS[primaryModality] || primaryModality}
            {extraCount > 0 && ` +${extraCount}`}
          </div>
        )}
      </div>

      <div className={styles.courseCardContent}>
        <div className={styles.courseCardHeader}>
          <h3 className={styles.courseCardTitle}>{course.title}</h3>
          {canEdit && (
            <div className={styles.courseCardActions}>
              {/* StopPropagation para que los botones de edición no abran el curso */}
              <button 
                className={styles.expandButton} 
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit && onEdit(course);
                }}
              >
                Editar
              </button>

              <button 
                className={styles.expandButton} 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete && onDelete(course.id);
                }}
              >
                🗑️
              </button>
            </div>
          )}
        </div>

        <p className={styles.courseCardDescription}>{displayDescription}</p>

        {needsExpansion && (
          <button className={styles.expandButton} onClick={toggleExpanded}>
            {expanded ? 'Ver menos' : 'Ver más'}
          </button>
        )}

        <div className={styles.courseCardFooter}>
          {formattedDate && <span className={styles.courseDate}>🗓️ {formattedDate}</span>}
          {course.materialCount !== undefined && (
            <span className={styles.materialCount}>📄 {course.materialCount} materiales</span>
          )}
        </div>

        {/* 3. Conectamos el botón principal */}
        <button className={styles.viewCourseButton} onClick={handleAction}>
          Ver Curso →
        </button>
      </div>
    </article>
  );
}

CourseCard.propTypes = {
  course: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    imageUrl: PropTypes.string,
    modality: PropTypes.string,
    allowedModalities: PropTypes.array,
    createdAt: PropTypes.string,
    materialCount: PropTypes.number
  }).isRequired,
  userRole: PropTypes.string,
  onViewDetails: PropTypes.func // 4. Validamos la nueva prop
};

export default CourseCard;