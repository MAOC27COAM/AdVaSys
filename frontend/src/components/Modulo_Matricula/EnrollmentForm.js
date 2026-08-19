import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import styles from './EnrollmentForm.module.css';
import { studentService } from '../../services/studentService';

const API_URL = process.env.REACT_APP_API_URL || '/api';
const MODALITIES = ['PRE_U', 'BECA_18', 'SECUNDARIA', 'PRIMARIA', 'COAR', 'PRIMERA_OPCION'];
const GRUPOS = ['A', 'B', 'C', 'D', 'E'];
const SECCION = ['1', '2', '3', '4', '5', '6'];
const SCHEDULES = ['TURNO_MANANA', 'TURNO_TARDE', 'TURNO_COMPLETO'];
const PAYMENT_AGREEMENT_TYPES = ['MONTHLY_INSTALLMENTS', 'CUSTOM_PARTS', 'SINGLE_PAYMENT'];
const DNI_REGEX = /^\d{8}$/;
const NUMERIC_REGEX = /^\d*$/;
const PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PROFILE_IMAGE_MB = 1;

function EnrollmentForm({ onClose, onSuccess, cycleId, studentData, cycleClosed = false }) {
  const [formData, setFormData] = useState({
    userData: {
      firstName: '',
      lastName: '',
      email: '',
      documentId: '',
      phone: '',
      address: '',
      profilePictureUrl: '',
    },
    studentProfileData: {
      modality: '',
      schedule: '',
      age: '',
      schoolOfOrigin: '',
      guardianName: '',
      guardianPhone: '',
      group: '',
      section: '',
    },
    paymentAgreementData: {
      receiptNumber: '',
      totalAmount: '',
      initialPaymentAmount: '',
      agreementType: '',
      installments: [],
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);

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

  useEffect(() => {
    const loadStudentData = async () => {
      if (!(studentData && studentData.id)) {
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const fullStudent = await studentService.getStudentById(studentData.id);
        setFormData({
          userData: {
            firstName: fullStudent.firstName || '',
            lastName: fullStudent.lastName || '',
            email: fullStudent.email || '',
            documentId: fullStudent.documentId || '',
            phone: fullStudent.phone || '',
            address: fullStudent.address || '',
            profilePictureUrl: fullStudent.profilePictureUrl || '',
          },
          studentProfileData: {
            modality: fullStudent.studentProfile?.modality || '',
            schedule: fullStudent.studentProfile?.schedule || '',
            age: fullStudent.studentProfile?.age || '',
            schoolOfOrigin: fullStudent.studentProfile?.schoolOfOrigin || '',
            guardianName: fullStudent.studentProfile?.guardianName || '',
            guardianPhone: fullStudent.studentProfile?.guardianPhone || '',
            group: fullStudent.studentProfile?.group || '',
            section: fullStudent.studentProfile?.section || '',
          },
          paymentAgreementData: {
            receiptNumber: '',
            totalAmount: '',
            initialPaymentAmount: '',
            agreementType: '',
            installments: [],
          },
        });
      } catch (err) {
        console.error('Error al cargar detalles:', err);
        setError('No se pudieron cargar los datos completos del estudiante.');
      } finally {
        setLoading(false);
      }
    };

    loadStudentData();
  }, [studentData]);

  const normalizeNumericValue = (value, maxLength = null) => {
    const digitsOnly = value.replace(/\D/g, '');
    return maxLength ? digitsOnly.slice(0, maxLength) : digitsOnly;
  };

  const handleUserChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === 'documentId' ? normalizeNumericValue(value, 8) : value;

    setFormData((current) => ({
      ...current,
      userData: {
        ...current.userData,
        [name]: nextValue,
      },
    }));
  };

  const handleStudentProfileChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === 'guardianPhone') {
      nextValue = normalizeNumericValue(value);
    }

    setFormData((current) => ({
      ...current,
      studentProfileData: {
        ...current.studentProfileData,
        [name]: name === 'age' ? (nextValue === '' ? '' : parseInt(nextValue, 10)) : nextValue,
      },
    }));
  };

  const handlePaymentAgreementChange = (event) => {
    const { name, value } = event.target;
    const nextValue = name === 'receiptNumber' ? normalizeNumericValue(value, 8) : value;

    setFormData((current) => ({
      ...current,
      paymentAgreementData: {
        ...current.paymentAgreementData,
        [name]: ['totalAmount', 'initialPaymentAmount'].includes(name)
          ? (nextValue === '' ? '' : parseFloat(nextValue))
          : nextValue,
      },
    }));
  };

  const handleProfileImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!PROFILE_IMAGE_TYPES.includes(file.type)) {
      setError('La foto de perfil debe estar en formato JPG, PNG o WEBP.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_PROFILE_IMAGE_MB * 1024 * 1024) {
      setError(`La foto de perfil no debe superar ${MAX_PROFILE_IMAGE_MB} MB.`);
      event.target.value = '';
      return;
    }

    setUploadingProfileImage(true);
    setError(null);

    try {
      const response = await studentService.uploadProfileImage(file);
      setFormData((current) => ({
        ...current,
        userData: {
          ...current.userData,
          profilePictureUrl: response.imageUrl,
        },
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo subir la foto de perfil.');
    } finally {
      setUploadingProfileImage(false);
      event.target.value = '';
    }
  };

  const handleInstallmentChange = (index, event) => {
    const newInstallments = [...formData.paymentAgreementData.installments];
    newInstallments[index] = {
      ...newInstallments[index],
      [event.target.name]: event.target.value,
    };
    setFormData((current) => ({
      ...current,
      paymentAgreementData: { ...current.paymentAgreementData, installments: newInstallments },
    }));
  };

  const addInstallment = () => {
    setFormData((current) => ({
      ...current,
      paymentAgreementData: {
        ...current.paymentAgreementData,
        installments: [...current.paymentAgreementData.installments, { dueDate: '', amount: '' }],
      },
    }));
  };

  const removeInstallment = (index) => {
    const newInstallments = formData.paymentAgreementData.installments.filter(
      (_, itemIndex) => itemIndex !== index
    );
    setFormData((current) => ({
      ...current,
      paymentAgreementData: { ...current.paymentAgreementData, installments: newInstallments },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (cycleClosed) {
        throw new Error('Ciclo terminado');
      }

      if (!DNI_REGEX.test(formData.userData.documentId.trim())) {
        throw new Error('El DNI debe contener exactamente 8 digitos numericos.');
      }

      if (
        formData.studentProfileData.guardianPhone &&
        !NUMERIC_REGEX.test(formData.studentProfileData.guardianPhone)
      ) {
        throw new Error('El celular del apoderado solo admite valores numericos.');
      }

      if (
        formData.paymentAgreementData.receiptNumber &&
        !NUMERIC_REGEX.test(formData.paymentAgreementData.receiptNumber)
      ) {
        throw new Error('El numero de recibo solo admite valores numericos.');
      }

      const isEditing = Boolean(studentData && studentData.id);

      if (!isEditing) {
        const totalAmount = parseFloat(formData.paymentAgreementData.totalAmount || 0);
        const initialPaymentAmount = parseFloat(formData.paymentAgreementData.initialPaymentAmount || 0);

        if (initialPaymentAmount < 0) {
          throw new Error('El monto inicial no puede ser negativo.');
        }

        if (initialPaymentAmount > totalAmount) {
          throw new Error('El monto inicial no puede ser mayor al monto total.');
        }
      }

      const payload = isEditing
        ? {
            userData: formData.userData,
            studentProfileData: formData.studentProfileData,
            cycleId,
          }
        : { ...formData, cycleId };

      const token = localStorage.getItem('token');
      const response = isEditing
        ? await axios.put(`${API_URL}/students/${studentData.id}`, payload, {
            headers: { Authorization: `Bearer ${token}` },
          })
        : await axios.post(`${API_URL}/students/enrollment`, payload, {
            headers: { Authorization: `Bearer ${token}` },
          });

      setSuccessMessage(response.data.message || 'Operacion exitosa');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error en el formulario:', err);
      setError(err.response?.data?.error || err.message || 'Error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const selectedModality = formData.studentProfileData.modality;
  const showGroupField = selectedModality === 'PRE_U' || selectedModality === 'PRIMERA_OPCION';
  const showSectionField = selectedModality === 'SECUNDARIA';
  const isEditing = Boolean(studentData);

  const modalContent = (
    <div className={styles['enrollment-form-overlay']}>
      <div className={styles['enrollment-form-modal']}>
        <div className={styles['form-header']}>
          <h3 className={styles['form-title']}>
            {isEditing ? `Editando estudiante: ${studentData.firstName}` : 'Matricular Nuevo Estudiante'}
          </h3>
          <button type="button" onClick={onClose} className={styles['close-button']}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles['enrollment-form']}>
          <fieldset>
            <legend>Datos Personales</legend>
            <div className={styles['form-grid']}>
              <div className={styles['form-group']}>
                <label htmlFor="firstName">Nombres *</label>
                <input type="text" id="firstName" name="firstName" value={formData.userData.firstName} onChange={handleUserChange} required />
              </div>
              <div className={styles['form-group']}>
                <label htmlFor="lastName">Apellidos *</label>
                <input type="text" id="lastName" name="lastName" value={formData.userData.lastName} onChange={handleUserChange} required />
              </div>
              <div className={styles['form-group']}>
                <label htmlFor="documentId">DNI *</label>
                <input
                  type="text"
                  id="documentId"
                  name="documentId"
                  inputMode="numeric"
                  maxLength="8"
                  readOnly={isEditing}
                  value={formData.userData.documentId}
                  onChange={handleUserChange}
                  required
                />
              </div>
              <div className={styles['form-group']}>
                <label htmlFor="email">Email</label>
                <input type="email" id="email" name="email" value={formData.userData.email} onChange={handleUserChange} />
              </div>
              <div className={styles['form-group']}>
                <label htmlFor="phone">Telefono</label>
                <input type="text" id="phone" name="phone" value={formData.userData.phone} onChange={handleUserChange} />
              </div>
              <div className={styles['form-group']}>
                <label htmlFor="address">Direccion</label>
                <input type="text" id="address" name="address" value={formData.userData.address} onChange={handleUserChange} />
              </div>
              <div className={styles['form-group']} style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="profilePicture">Foto de perfil</label>
                <div className={styles['profile-upload-row']}>
                  <div className={styles['profile-preview-card']}>
                    {formData.userData.profilePictureUrl ? (
                      <img
                        src={formData.userData.profilePictureUrl}
                        alt="Vista previa de perfil"
                        className={styles['profile-preview-image']}
                      />
                    ) : (
                      <div className={styles['profile-preview-placeholder']}>Sin foto</div>
                    )}
                  </div>
                  <div className={styles['profile-upload-actions']}>
                    <label htmlFor="profilePicture" className={styles['profile-upload-button']}>
                      {uploadingProfileImage ? 'Subiendo...' : 'Subir foto'}
                    </label>
                    <input
                      id="profilePicture"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleProfileImageUpload}
                      className={styles['hidden-file-input']}
                      disabled={uploadingProfileImage}
                    />
                    <small className={styles['profile-upload-hint']}>JPG, PNG o WEBP · max. 1 MB</small>
                  </div>
                </div>
              </div>
            </div>
          </fieldset>

          <div className={styles['student-and-payment-wrapper']}>
            <fieldset>
              <legend>Perfil de Estudiante</legend>
              <div className={styles['form-grid']}>
                <div className={styles['form-group']}>
                  <label htmlFor="modality">Modalidad *</label>
                  <select id="modality" name="modality" value={formData.studentProfileData.modality} onChange={handleStudentProfileChange} required>
                    <option value="">Selecciona...</option>
                    {MODALITIES.map((modality) => <option key={modality} value={modality}>{modality}</option>)}
                  </select>
                </div>
                <div className={styles['form-group']}>
                  <label htmlFor="schedule">Turno *</label>
                  <select id="schedule" name="schedule" value={formData.studentProfileData.schedule} onChange={handleStudentProfileChange} required>
                    <option value="">Selecciona...</option>
                    {SCHEDULES.map((schedule) => <option key={schedule} value={schedule}>{schedule}</option>)}
                  </select>
                </div>
                <div className={styles['form-group']}>
                  <label htmlFor="age">Edad</label>
                  <input type="number" id="age" name="age" value={formData.studentProfileData.age} onChange={handleStudentProfileChange} />
                </div>
                <div className={styles['form-group']}>
                  <label htmlFor="schoolOfOrigin">Colegio de Procedencia</label>
                  <input type="text" id="schoolOfOrigin" name="schoolOfOrigin" value={formData.studentProfileData.schoolOfOrigin} onChange={handleStudentProfileChange} />
                </div>
                <div className={styles['form-group']}>
                  <label htmlFor="guardianName">Nombre del apoderado</label>
                  <input type="text" id="guardianName" name="guardianName" value={formData.studentProfileData.guardianName} onChange={handleStudentProfileChange} />
                </div>
                <div className={styles['form-group']}>
                  <label htmlFor="guardianPhone">Celular del apoderado</label>
                  <input
                    type="text"
                    id="guardianPhone"
                    name="guardianPhone"
                    inputMode="numeric"
                    value={formData.studentProfileData.guardianPhone}
                    onChange={handleStudentProfileChange}
                  />
                </div>
                {showGroupField && (
                  <div className={styles['form-group']}>
                    <label htmlFor="group">Grupo *</label>
                    <select id="group" name="group" value={formData.studentProfileData.group} onChange={handleStudentProfileChange} required>
                      <option value="">Selecciona...</option>
                      {GRUPOS.map((group) => <option key={group} value={group}>{group}</option>)}
                    </select>
                  </div>
                )}
                {showSectionField && (
                  <div className={styles['form-group']}>
                    <label htmlFor="section">Seccion *</label>
                    <select id="section" name="section" value={formData.studentProfileData.section} onChange={handleStudentProfileChange} required>
                      <option value="">Selecciona...</option>
                      {SECCION.map((section) => <option key={section} value={section}>{section}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </fieldset>

            {!isEditing && (
              <fieldset>
                <legend>Acuerdo de Pago</legend>
                <div className={styles['form-grid']}>
                  <div className={styles['form-group']}>
                    <label htmlFor="receiptNumber">Numero de Recibo</label>
                    <input
                      type="text"
                      id="receiptNumber"
                      name="receiptNumber"
                      inputMode="numeric"
                      maxLength="8"
                      value={formData.paymentAgreementData.receiptNumber}
                      onChange={handlePaymentAgreementChange}
                    />
                  </div>
                  <div className={styles['form-group']}>
                    <label htmlFor="totalAmount">Monto Total *</label>
                    <input type="number" id="totalAmount" name="totalAmount" value={formData.paymentAgreementData.totalAmount} onChange={handlePaymentAgreementChange} min="0" step="0.01" required />
                  </div>
                  <div className={styles['form-group']}>
                    <label htmlFor="initialPaymentAmount">Monto Inicial</label>
                    <input type="number" id="initialPaymentAmount" name="initialPaymentAmount" value={formData.paymentAgreementData.initialPaymentAmount} onChange={handlePaymentAgreementChange} min="0" step="0.01" />
                  </div>
                  <div className={styles['form-group']}>
                    <label htmlFor="agreementType">Tipo de Acuerdo *</label>
                    <select id="agreementType" name="agreementType" value={formData.paymentAgreementData.agreementType} onChange={handlePaymentAgreementChange} required>
                      <option value="">Selecciona...</option>
                      {PAYMENT_AGREEMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                </div>

                {formData.paymentAgreementData.agreementType === 'CUSTOM_PARTS' && (
                  <div className={styles['installments-section']}>
                    <h4>Cuotas Personalizadas</h4>
                    <div className={styles['installments-list']}>
                      {formData.paymentAgreementData.installments.map((installment, index) => (
                        <div key={index} className={styles['installment-item']}>
                          <div className={styles['form-group']}>
                            <label>Fecha de Vencimiento</label>
                            <input type="date" name="dueDate" value={installment.dueDate} onChange={(event) => handleInstallmentChange(index, event)} required />
                          </div>
                          <div className={styles['form-group']}>
                            <label>Monto</label>
                            <input type="number" name="amount" value={installment.amount} onChange={(event) => handleInstallmentChange(index, event)} required />
                          </div>
                          <button type="button" onClick={() => removeInstallment(index)} className={styles['remove-installment-button']} title="Eliminar cuota">×</button>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={addInstallment} className={styles['add-installment-button']}>+ Anadir Cuota</button>
                  </div>
                )}
              </fieldset>
            )}
          </div>

          {cycleClosed && <div className={styles['error-message']}>Ciclo terminado</div>}
          {error && <div className={styles['error-message']}>{error}</div>}
          {successMessage && <div className={styles['success-message']}>{successMessage}</div>}

          <div className={styles['form-actions']}>
            <button type="button" onClick={onClose} className={styles['cancel-button']}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || cycleClosed || uploadingProfileImage}
              className={styles['submit-button']}
            >
              {loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Matricular Estudiante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default EnrollmentForm;
