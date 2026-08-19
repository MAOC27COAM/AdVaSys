import React, { useState, useRef } from 'react';
import { courseService } from '../../../services/courseService';
import styles from './FileUploadZone.module.css';

const MAX_SIZE_MB = 20;
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
];

function FileUploadZone({ courseId, onUploadSuccess, onCancel }) {
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef(null);

  const validateFile = (selectedFile) => {
    if (!selectedFile) return 'No se selecciono ningun archivo.';

    if (selectedFile.size > MAX_SIZE_MB * 1024 * 1024) {
      return `El archivo excede los ${MAX_SIZE_MB}MB.`;
    }

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      return 'Formato no permitido.';
    }

    return null;
  };

  const acceptFile = (selectedFile) => {
    if (!selectedFile) return;

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleFileChange = (event) => {
    acceptFile(event.target.files[0]);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files[0]);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file || uploading) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', description.trim());

      await courseService.uploadMaterial(courseId, formData);

      handleRemoveFile();
      setDescription('');
      onUploadSuccess?.();
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al subir el archivo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.uploadCard}>
      <div className={styles.header}>
        <h3>Nuevo Recurso</h3>
        <p>PDF, Office, imagenes y texto · Max {MAX_SIZE_MB}MB</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div
          className={`${styles.dropZone} ${file ? styles.hasFile : ''} ${dragging ? styles.dragging : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            id="fileInput"
            className={styles.hiddenInput}
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,image/jpeg,image/png,image/webp"
          />

          <label htmlFor="fileInput" className={styles.fileLabel}>
            <div className={styles.icon}>Seleccionar</div>

            {!file ? (
              <span>Seleccionar archivo</span>
            ) : (
              <div className={styles.fileInfo}>
                <span>{file.name}</span>
                <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
              </div>
            )}
          </label>

          {file && (
            <button type="button" onClick={handleRemoveFile} className={styles.removeBtn}>
              ×
            </button>
          )}
        </div>

        <div className={styles.inputGroup}>
          <label>Descripcion</label>
          <input
            type="text"
            placeholder="Ej: Semana 1 - Introduccion"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={styles.input}
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.actions}>
          <button type="button" onClick={onCancel} disabled={uploading} className={styles.cancel}>
            Cancelar
          </button>

          <button type="submit" disabled={uploading || !file} className={styles.submit}>
            {uploading ? 'Subiendo...' : 'Subir archivo'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FileUploadZone;
