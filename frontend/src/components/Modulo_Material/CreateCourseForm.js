import React, { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import styles from './CreateCourseForm.module.css';
import { MODALITY_LABELS } from './modalities';

const API_URL = process.env.REACT_APP_API_URL || '/api';
const MAX_COURSE_IMAGE_MB = 4;

const MODALITIES = Object.keys(MODALITY_LABELS);

const initialFormState = {
  title: '',
  code: '',
  description: '',
  selectedModalities: [],
};

const getEditableModalities = (allowedModalities = []) =>
  Array.isArray(allowedModalities)
    ? allowedModalities
        .map((item) => (typeof item === 'string' ? item : item?.modality))
        .filter(Boolean)
    : [];

function CreateCourseForm({ onClose, onSuccess, courseToEdit }) {
  const [formData, setFormData] = useState(initialFormState);
  const [image, setImage] = useState({ file: null, preview: '' });
  const [imageRemoved, setImageRemoved] = useState(false);
  const [status, setStatus] = useState({ loading: false, error: null, success: null });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    return () => {
      if (image.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(image.preview);
      }
    };
  }, [image.preview]);

  useEffect(() => {
    if (courseToEdit) {
      setFormData({
        title: courseToEdit.title || '',
        code: courseToEdit.code || '',
        description: courseToEdit.description || '',
        selectedModalities: getEditableModalities(courseToEdit.allowedModalities),
      });
      setImage({ file: null, preview: courseToEdit.imageUrl || '' });
      setImageRemoved(false);
    } else {
      setFormData(initialFormState);
      setImage({ file: null, preview: '' });
      setImageRemoved(false);
    }
  }, [courseToEdit]);

  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = 'El titulo es obligatorio';
    }
    if (!formData.selectedModalities.length) {
      newErrors.modalities = 'Selecciona al menos una modalidad';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = useCallback(({ target: { name, value } }) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  }, []);

  const toggleModality = useCallback((mod) => {
    setFormData((prev) => {
      const exists = prev.selectedModalities.includes(mod);
      return {
        ...prev,
        selectedModalities: exists
          ? prev.selectedModalities.filter((item) => item !== mod)
          : [...prev.selectedModalities, mod],
      };
    });
    setErrors((prev) => ({ ...prev, modalities: null }));
  }, []);

  const handleImage = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setStatus((prev) => ({ ...prev, error: 'Solo se permiten imagenes JPG, PNG o WEBP.' }));
      return;
    }

    if (file.size > MAX_COURSE_IMAGE_MB * 1024 * 1024) {
      setStatus((prev) => ({
        ...prev,
        error: `La imagen no debe superar ${MAX_COURSE_IMAGE_MB} MB.`,
      }));
      return;
    }

    setImage((prev) => {
      if (prev.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(prev.preview);
      }
      return { file, preview: URL.createObjectURL(file) };
    });
    setImageRemoved(false);
    setStatus((prev) => ({ ...prev, error: null }));
  }, []);

  const removeImage = useCallback(() => {
    setImage((prev) => {
      if (prev.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(prev.preview);
      }
      return { file: null, preview: '' };
    });
    setImageRemoved(true);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setStatus({ loading: true, error: null, success: null });

    try {
      const token = localStorage.getItem('token');
      const data = new FormData();

      data.append('title', formData.title.trim());
      data.append('description', formData.description.trim() || '');
      data.append('allowedModalities', JSON.stringify(formData.selectedModalities));

      if (courseToEdit) {
        if (formData.code.trim()) {
          data.append('code', formData.code.trim());
        }
      } else {
        data.append('code', formData.code.trim() || `CUR-${Date.now()}`);
      }

      if (courseToEdit && imageRemoved) {
        data.append('imageUrl', '');
      } else if (image.file) {
        data.append('image', image.file);
      }

      if (courseToEdit) {
        await axios.patch(`${API_URL}/courses/${courseToEdit.id}`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${API_URL}/courses`, data, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setStatus({
        loading: false,
        success: courseToEdit ? 'Curso actualizado exitosamente.' : 'Curso creado exitosamente.',
        error: null,
      });
      setTimeout(onSuccess, 1200);
    } catch (err) {
      console.error('Error en peticion:', err.response?.data);
      setStatus({
        loading: false,
        error: err.response?.data?.message || err.response?.data?.error || 'Error al guardar el curso.',
        success: null,
      });
    }
  };

  return (
    <div className={styles.modalBody}>
      <header className={styles.modalHeader}>
        <h3>{courseToEdit ? 'Editar Curso' : 'Nuevo Curso'}</h3>
        <button onClick={onClose} className={styles.closeBtn} type="button" aria-label="Cerrar">
          ×
        </button>
      </header>

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.scrollArea}>
          <div className={styles.field}>
            <label htmlFor="title">Titulo</label>
            <input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Ej: Matematicas Avanzadas III"
              className={errors.title ? styles.inputError : ''}
            />
            {errors.title && <span className={styles.errorText}>{errors.title}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="description">Descripcion</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe brevemente el contenido del curso..."
            />
          </div>

          <div className={styles.field}>
            <label>Modalidades</label>
            <div className={styles.tagsGrid}>
              {MODALITIES.map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => toggleModality(mod)}
                  className={`${styles.tag} ${
                    formData.selectedModalities.includes(mod) ? styles.tagActive : ''
                  }`}
                >
                  {MODALITY_LABELS[mod]}
                </button>
              ))}
            </div>
            {errors.modalities && <span className={styles.errorText}>{errors.modalities}</span>}
          </div>

          <div className={styles.field}>
            <label>Imagen del curso</label>
            {image.preview ? (
              <div className={styles.previewWrap}>
                <img src={image.preview} alt="Vista previa" />
                <button type="button" onClick={removeImage} className={styles.removeBtn}>
                  Eliminar
                </button>
              </div>
            ) : (
              <label className={styles.dropzone}>
                <input
                  type="file"
                  hidden
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImage}
                />
                <div className={styles.dropzoneIcon}>🖼</div>
                <span>Arrastra o haz clic para subir</span>
                <span className={styles.dropzoneHint}>PNG, JPG, WEBP · max. 4 MB</span>
              </label>
            )}
          </div>
        </div>

        {status.error && <p className={`${styles.statusMsg} ${styles.errorMsg}`}>{status.error}</p>}
        {status.success && <p className={`${styles.statusMsg} ${styles.successMsg}`}>{status.success}</p>}

        <footer className={styles.footer}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>
            Cancelar
          </button>
          <button type="submit" className={styles.submitBtn} disabled={status.loading}>
            {status.loading ? 'Guardando...' : 'Guardar curso'}
          </button>
        </footer>
      </form>
    </div>
  );
}

CreateCourseForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  courseToEdit: PropTypes.object,
};

export default CreateCourseForm;
