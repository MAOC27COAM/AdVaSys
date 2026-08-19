import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { courseService } from '../../../services/courseService';
import FileIcon from './FileIcon';
import CustomViewer from './CustomViewer';
import FileUploadZone from './FileUploadZone';
import ConfirmDialog from '../ConfirmDialog';
import Toast from '../Toast';
import { MODALITY_LABELS, getAllowedModalities } from '../modalities';
import styles from './CourseDetail.module.css';

const canPreviewFile = (mimeType) => {
  if (!mimeType) return false;
  return mimeType.includes('pdf') || mimeType.includes('image');
};

function CourseDetail({ courseId, onBack, userRole }) {
  const [course, setCourse] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [previewingFile, setPreviewingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [toast, setToast] = useState(null);

  const isPrivilegedUser = ['admin', 'matriculador', 'kami', 'teacher'].includes(userRole);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [courseData, filesData] = await Promise.all([
        courseService.getCourseById(courseId),
        courseService.getCourseMaterials(courseId),
      ]);
      setCourse(courseData);
      const finalFiles = Array.isArray(filesData)
        ? filesData
        : filesData.materials || filesData.data || [];
      setFiles(finalFiles);
    } catch (err) {
      setError(err.message || 'Error al cargar el curso.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const closePreview = useCallback(() => {
    if (typeof previewUrl === 'string' && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewingFile(null);
    setPreviewUrl(null);
  }, [previewUrl]);

  const handleOpenMaterial = async (file) => {
    const realId = file.id || file._id;
    setPreviewingFile(file);
    setPreviewLoading(true);
    setError(null);
    try {
      const binaryData = await courseService.getMaterialBinary(realId);
      const mimeType = file.mimeType;
      if (mimeType?.includes('pdf')) {
        const header = new Uint8Array(binaryData.slice(0, 4));
        const isPDF = header[0] === 37 && header[1] === 80 && header[2] === 68 && header[3] === 70;
        if (!isPDF) throw new Error('El archivo descargado no tiene estructura de PDF.');
        setPreviewUrl(binaryData);
      } else {
        const blob = new Blob([binaryData], { type: mimeType });
        setPreviewUrl(URL.createObjectURL(blob));
      }
    } catch (err) {
      console.error('Error al abrir material:', err);
      setError(err.message || 'No se pudo cargar el material.');
      setPreviewingFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    setShowUpload(false);
    fetchDetails();
    setToast({ type: 'success', message: 'Material subido correctamente.' });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    const fileId = confirmDelete.id || confirmDelete._id;
    try {
      setDeletingFileId(fileId);
      setError(null);
      await courseService.deleteMaterial(fileId);
      if ((previewingFile?.id || previewingFile?._id) === fileId) {
        closePreview();
      }
      await fetchDetails();
      setToast({ type: 'success', message: 'Material eliminado correctamente.' });
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo eliminar el material.');
    } finally {
      setDeletingFileId(null);
      setConfirmDelete(null);
    }
  };

  if (loading) return <div className={styles.loader}><span />Cargando curso...</div>;
  if (error && !course) return <div className={styles.errorFull}>{error}</div>;
  if (!course) return <div className={styles.errorFull}>No se encontró el curso.</div>;

  const modalities = getAllowedModalities(course);

  return (
    <div className={styles.detailContainer}>
      <div className={styles.topActions}>
        <button onClick={onBack} className={styles.backButton} type="button">
          ← Volver a Cursos
        </button>
      </div>

      <div className={styles.scrollableContent}>
        <header className={styles.courseHero}>
          {course.imageUrl && (
            <img
              src={course.imageUrl}
              alt={`Portada de ${course.title}`}
              className={styles.heroBg}
            />
          )}
          <div className={styles.heroOverlay}>
            <div className={styles.badgeRow}>
              {modalities.map((modality) => (
                <span key={modality} className={styles.badge}>
                  {MODALITY_LABELS[modality] || modality}
                </span>
              ))}
            </div>
            <h1 className={styles.heroTitle}>{course.title}</h1>
            {course.description && (
              <p className={styles.heroDescription}>{course.description}</p>
            )}
          </div>
        </header>

        <main className={styles.contentSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Materiales de Clase</h2>
            {isPrivilegedUser && (
              <button
                className={styles.uploadBtn}
                type="button"
                onClick={() => setShowUpload((v) => !v)}
              >
                {showUpload ? 'Cerrar Panel' : '+ Subir Archivo'}
              </button>
            )}
          </div>

          {showUpload && (
            <div className={styles.uploadWrapper}>
              <FileUploadZone
                courseId={courseId}
                onUploadSuccess={handleUploadSuccess}
                onCancel={() => setShowUpload(false)}
              />
            </div>
          )}

          {error && <div className={styles.inlineError}>{error}</div>}

          <div className={styles.fileGrid}>
            {files.length > 0 ? (
              files.map((file) => {
                const id = file.id || file._id;
                const isLoading = previewLoading && (previewingFile?.id === id || previewingFile?._id === id);
                const isDeleting = deletingFileId === id;
                const previewable = canPreviewFile(file.mimeType);
                return (
                  <div key={id} className={styles.fileCard}>
                    <div className={styles.fileIconWrap}>
                      <FileIcon mimeType={file.mimeType} />
                    </div>
                    <div className={styles.fileInfo}>
                      <p className={styles.fileName} title={file.name}>{file.name}</p>
                      <span className={styles.fileMeta}>{file.mimeType || 'Archivo'}</span>
                    </div>
                    <div className={styles.fileActions}>
                      {previewable ? (
                        <button
                          className={styles.viewBtn}
                          type="button"
                          onClick={() => handleOpenMaterial(file)}
                          disabled={isLoading || isDeleting}
                          aria-label={`Visualizar ${file.name}`}
                        >
                          {isLoading ? '...' : 'Visualizar'}
                        </button>
                      ) : (
                        <span className={styles.noPreview}>Sin vista previa</span>
                      )}
                      {isPrivilegedUser && (
                        <button
                          className={styles.deleteBtn}
                          type="button"
                          onClick={() => setConfirmDelete(file)}
                          disabled={isDeleting}
                          aria-label={`Eliminar ${file.name}`}
                        >
                          {isDeleting ? '...' : 'Eliminar'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyFiles}>
                <p>Aún no hay archivos subidos en este curso.</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {previewUrl && (
        <CustomViewer
          file={previewingFile}
          blobUrl={previewUrl}
          onClose={closePreview}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar material"
        message={`¿Seguro que quieres eliminar "${confirmDelete?.name}"?`}
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

CourseDetail.propTypes = {
  courseId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onBack: PropTypes.func.isRequired,
  userRole: PropTypes.string,
};

export default CourseDetail;