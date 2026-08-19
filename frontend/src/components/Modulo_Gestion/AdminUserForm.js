import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { userService } from '../../services/userService';
import styles from './AdminUserForm.module.css';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'teacher', label: 'Profesor' },
  { value: 'matriculador', label: 'Matriculador' },
];

const DNI_REGEX = /^\d{8}$/;

function AdminUserForm({ onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    roleName: '',
    username: '',
    password: '',
    confirmPassword: '',
    documentId: '',
    firstName: '',
    lastName: '',
    employmentStatus: '',
    specialty: '',
    academicDegree: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const validateStep1 = () => {
    if (!formData.roleName) {
      throw new Error('Debes seleccionar un rol.');
    }
    if (!formData.username.trim()) {
      throw new Error('El nombre de usuario es requerido.');
    }
    if (!formData.password) {
      throw new Error('La contraseña es requerida.');
    }
    if (formData.password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }
    if (formData.password !== formData.confirmPassword) {
      throw new Error('Las contraseñas no coinciden.');
    }
    if (!DNI_REGEX.test(formData.documentId.trim())) {
      throw new Error('El DNI debe contener exactamente 8 digitos numericos.');
    }
  };

  const handleContinue = (event) => {
    event.preventDefault();
    setError(null);
    try {
      validateStep1();
      setStep(2);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        throw new Error('Nombres y apellidos son requeridos.');
      }
      if (
        formData.roleName === 'teacher' &&
        (!formData.employmentStatus.trim() || !formData.specialty.trim())
      ) {
        throw new Error('La situacion laboral y la especialidad son requeridas para el profesor.');
      }

      const payload = {
        roleName: formData.roleName,
        username: formData.username.trim(),
        password: formData.password,
        documentId: formData.documentId.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        ...(formData.roleName === 'teacher' && {
          teacherProfile: {
            employmentStatus: formData.employmentStatus.trim(),
            specialty: formData.specialty.trim(),
            academicDegree: formData.academicDegree.trim(),
          },
        }),
      };

      const response = await userService.createAdminUser(payload);
      setSuccessMessage(response.message || 'Usuario creado exitosamente');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error al crear el usuario.');
    } finally {
      setLoading(false);
    }
  };

  const isTeacher = formData.roleName === 'teacher';

  const modalContent = (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.formHeader}>
          <h3 className={styles.formTitle}>
            {step === 1 ? 'Registrar nuevo usuario' : 'Datos personales'}
          </h3>
          <button type="button" onClick={onClose} className={styles.closeButton}>×</button>
        </div>

        <div className={styles.stepsIndicator}>
          <div className={`${styles.step} ${step === 1 ? styles.stepActive : styles.stepDone}`}>
            1. Cuenta
          </div>
          <div className={styles.stepLine} />
          <div className={`${styles.step} ${step === 2 ? styles.stepActive : ''}`}>
            2. Datos personales
          </div>
        </div>

        <form onSubmit={step === 1 ? handleContinue : handleSubmit} className={styles.form}>
          {step === 1 && (
            <fieldset>
              <legend>Cuenta de acceso</legend>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="roleName">Rol *</label>
                  <select id="roleName" name="roleName" value={formData.roleName} onChange={handleChange} required>
                    <option value="">Selecciona...</option>
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="username">Nombre de usuario *</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    autoComplete="off"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="documentId">DNI *</label>
                  <input
                    type="text"
                    id="documentId"
                    name="documentId"
                    inputMode="numeric"
                    maxLength="8"
                    value={formData.documentId}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="password">Contraseña *</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="confirmPassword">Confirmar contraseña *</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            </fieldset>
          )}

          {step === 2 && (
            <fieldset>
              <legend>
                {isTeacher ? 'Datos personales del profesor' : `Datos personales del ${ROLE_OPTIONS.find((r) => r.value === formData.roleName)?.label?.toLowerCase() || 'usuario'}`}
              </legend>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="firstName">Nombres *</label>
                  <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="lastName">Apellidos *</label>
                  <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
                </div>
                {isTeacher && (
                  <>
                    <div className={styles.formGroup}>
                      <label htmlFor="employmentStatus">Situacion laboral *</label>
                      <input
                        type="text"
                        id="employmentStatus"
                        name="employmentStatus"
                        value={formData.employmentStatus}
                        onChange={handleChange}
                        placeholder="Ej: Contratado, Nombrado, Practicante"
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="specialty">Especialidad *</label>
                      <input
                        type="text"
                        id="specialty"
                        name="specialty"
                        value={formData.specialty}
                        onChange={handleChange}
                        placeholder="Ej: Matematicas, Comunicacion"
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label htmlFor="academicDegree">Grado academico</label>
                      <input
                        type="text"
                        id="academicDegree"
                        name="academicDegree"
                        value={formData.academicDegree}
                        onChange={handleChange}
                        placeholder="Opcional"
                      />
                    </div>
                  </>
                )}
              </div>
            </fieldset>
          )}

          {error && <div className={styles.errorMessage}>{error}</div>}
          {successMessage && <div className={styles.successMessage}>{successMessage}</div>}

          <div className={styles.formActions}>
            {step === 2 && (
              <button type="button" onClick={() => { setError(null); setStep(1); }} className={styles.cancelButton}>
                Volver
              </button>
            )}
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} className={styles.submitButton}>
              {loading ? 'Guardando...' : step === 1 ? 'Continuar' : 'Registrar usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default AdminUserForm;