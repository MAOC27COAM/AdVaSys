import React, { useCallback, useEffect, useReducer, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import './EnrollmentForm.module.css'; // Si usas CSS modules, ajusta import

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

/* ---------- Constantes / Labels ---------- */
const MODALITIES = ['PRE_U', 'BECA_18', 'SECUNDARIA', 'PRIMARIA', 'COAR', 'PRIMERA_OPCION'];
const SCHEDULES = ['TURNO_MANANA', 'TURNO_TARDE', 'TURNO_COMPLETO'];
const PAYMENT_AGREEMENT_TYPES = ['MONTHLY_INSTALLMENTS', 'CUSTOM_PARTS', 'SINGLE_PAYMENT'];

const LABELS = {
  PRE_U: 'Pre-universitario',
  BECA_18: 'Beca 18',
  SECUNDARIA: 'Secundaria',
  PRIMARIA: 'Primaria',
  COAR: 'COAR',
  PRIMERA_OPCION: 'Primera opción',
  TURNO_MANANA: 'Mañana',
  TURNO_TARDE: 'Tarde',
  TURNO_COMPLETO: 'Completo',
  MONTHLY_INSTALLMENTS: 'Cuotas mensuales',
  CUSTOM_PARTS: 'Cuotas personalizadas',
  SINGLE_PAYMENT: 'Pago único',
};

/* ---------- Estado inicial (lazy init) ---------- */
const makeInitialState = () => ({
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
    group: '',
    section: '',
  },
  paymentAgreementData: {
    totalAmount: '',
    agreementType: '',
    installments: [], // ahora cada cuota tendrá { id, dueDate, amount }
  },
  ui: {
    profileFile: null,
    profilePreviewUrl: '',
    loading: false,
    error: null,
    successMessage: null,
    validationErrors: {},
  },
});

/* ---------- Actions ---------- */
const ACTIONS = {
  UPDATE_FIELD: 'UPDATE_FIELD',
  ADD_INSTALLMENT: 'ADD_INSTALLMENT',
  REMOVE_INSTALLMENT: 'REMOVE_INSTALLMENT',
  UPDATE_INSTALLMENT: 'UPDATE_INSTALLMENT',
  SET_PROFILE_FILE: 'SET_PROFILE_FILE',
  SET_PROFILE_PREVIEW: 'SET_PROFILE_PREVIEW',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_SUCCESS: 'SET_SUCCESS',
  SET_VALIDATION_ERRORS: 'SET_VALIDATION_ERRORS',
  RESET_FORM: 'RESET_FORM',
};

/* ---------- Reducer ---------- */
function formReducer(state, action) {
  switch (action.type) {
    case ACTIONS.UPDATE_FIELD: {
      // payload: { section, field, value }
      const { section, field, value } = action.payload;
      return {
        ...state,
        [section]: {
          ...state[section],
          [field]: value,
        },
      };
    }

    case ACTIONS.ADD_INSTALLMENT: {
      const newInstallment = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), dueDate: '', amount: '' };
      return {
        ...state,
        paymentAgreementData: {
          ...state.paymentAgreementData,
          installments: [...state.paymentAgreementData.installments, newInstallment],
        },
      };
    }

    case ACTIONS.REMOVE_INSTALLMENT: {
      // payload: { id }
      const { id } = action.payload;
      const newInstallments = state.paymentAgreementData.installments.filter((it) => it.id !== id);
      const newErrors = { ...state.ui.validationErrors };
      // eliminamos keys relacionadas usando patrón
      Object.keys(newErrors)
        .filter((k) => k.startsWith('installment_'))
        .forEach((k) => {
          // si el key contiene el id (no usamos index), intentamos limpiar por posición antigua: para simplicidad se limpian todas cuotas si coincide
          // En este reducer solo limpiamos validaciones globales inexistentes al eliminar
        });

      return {
        ...state,
        paymentAgreementData: {
          ...state.paymentAgreementData,
          installments: newInstallments,
        },
        ui: { ...state.ui, validationErrors: newErrors },
      };
    }

    case ACTIONS.UPDATE_INSTALLMENT: {
      // payload: { id, field, value }
      const { id, field, value } = action.payload;
      return {
        ...state,
        paymentAgreementData: {
          ...state.paymentAgreementData,
          installments: state.paymentAgreementData.installments.map((it) =>
            it.id === id ? { ...it, [field]: value } : it
          ),
        },
      };
    }

    case ACTIONS.SET_PROFILE_FILE:
      return {
        ...state,
        ui: { ...state.ui, profileFile: action.payload },
      };

    case ACTIONS.SET_PROFILE_PREVIEW:
      return {
        ...state,
        ui: { ...state.ui, profilePreviewUrl: action.payload },
      };

    case ACTIONS.SET_LOADING:
      return {
        ...state,
        ui: { ...state.ui, loading: action.payload },
      };

    case ACTIONS.SET_ERROR:
      return {
        ...state,
        ui: { ...state.ui, error: action.payload, successMessage: null },
      };

    case ACTIONS.SET_SUCCESS:
      return {
        ...state,
        ui: { ...state.ui, successMessage: action.payload, error: null },
      };

    case ACTIONS.SET_VALIDATION_ERRORS:
      return {
        ...state,
        ui: { ...state.ui, validationErrors: action.payload },
      };

    case ACTIONS.RESET_FORM:
      return makeInitialState();

    default:
      return state;
  }
}

/* ---------- Utils pequeños ---------- */
const parseNumber = (value, isInt = false) => {
  if (value === '' || value == null) return '';
  const n = isInt ? parseInt(value, 10) : parseFloat(value);
  return Number.isNaN(n) ? '' : n;
};

/* ---------- Axios instance + interceptor ---------- */
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

/* ---------- FieldError componente memoizado ---------- */
const FieldError = React.memo(function FieldError({ children }) {
  if (!children) return null;
  return (
    <div className="field-error" role="alert">
      {children}
    </div>
  );
});
FieldError.propTypes = { children: PropTypes.node };

/* ---------- Componente principal ---------- */
export default function EnrollmentForm({ onClose, onSuccess, cycleId }) {
  const [state, dispatch] = useReducer(formReducer, null, makeInitialState);
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null); // para revoke seguro
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      // cleanup on unmount
      isMountedRef.current = false;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  // Configurar interceptor simple para headers (se monta una sola vez)
  useEffect(() => {
    const reqInterceptor = axiosInstance.interceptors.request.use((cfg) => {
      const token = localStorage.getItem('token');
      if (token) cfg.headers = { ...cfg.headers, Authorization: `Bearer ${token}` };
      return cfg;
    });

    return () => {
      axiosInstance.interceptors.request.eject(reqInterceptor);
    };
  }, []);

  const {
    userData,
    studentProfileData,
    paymentAgreementData,
    ui: { profileFile, profilePreviewUrl, loading, error, successMessage, validationErrors },
  } = state;

  const showGroupField = useMemo(
    () => studentProfileData.modality === 'PRE_U' || studentProfileData.modality === 'PRIMERA_OPCION',
    [studentProfileData.modality]
  );

  const showSectionField = useMemo(() => studentProfileData.modality === 'SECUNDARIA', [
    studentProfileData.modality,
  ]);

  /* ---------- Effect: preview de imagen (seguro) ---------- */
  useEffect(() => {
    if (!profileFile) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      dispatch({ type: ACTIONS.SET_PROFILE_PREVIEW, payload: '' });
      return;
    }

    const url = URL.createObjectURL(profileFile);
    previewUrlRef.current = url;
    dispatch({ type: ACTIONS.SET_PROFILE_PREVIEW, payload: url });

    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [profileFile]);

  /* ---------- Handlers básicos (memoizados) ---------- */
  const updateField = useCallback((section, field, value) => {
    dispatch({ type: ACTIONS.UPDATE_FIELD, payload: { section, field, value } });
  }, []);

  const handleInputChange = useCallback((e, section, options = {}) => {
    const { name, value } = e.target;
    const parsed = options.numeric ? parseNumber(value, options.integer) : value;
    updateField(section, name, parsed);
  }, [updateField]);

  const addInstallment = useCallback(() => dispatch({ type: ACTIONS.ADD_INSTALLMENT }), []);
  const removeInstallment = useCallback((id) => dispatch({ type: ACTIONS.REMOVE_INSTALLMENT, payload: { id } }), []);
  const handleInstallmentChange = useCallback((id, field, rawValue) => {
    const value = field === 'amount' ? parseNumber(rawValue) : rawValue;
    dispatch({ type: ACTIONS.UPDATE_INSTALLMENT, payload: { id, field, value } });
  }, []);

  const handleProfileFile = useCallback((e) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      dispatch({ type: ACTIONS.SET_PROFILE_FILE, payload: null });
      return;
    }
    if (!file.type.startsWith('image/')) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'El archivo debe ser una imagen.' });
      dispatch({ type: ACTIONS.SET_PROFILE_FILE, payload: null });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'La imagen debe ser menor a 2MB.' });
      dispatch({ type: ACTIONS.SET_PROFILE_FILE, payload: null });
      return;
    }

    dispatch({ type: ACTIONS.SET_ERROR, payload: null });
    dispatch({ type: ACTIONS.SET_PROFILE_FILE, payload: file });
  }, []);

  const removeProfilePicture = useCallback(() => {
    dispatch({ type: ACTIONS.SET_PROFILE_FILE, payload: null });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  /* ---------- Validación ---------- */
  const validate = useCallback(() => {
    const errs = {};
    // Personales
    if (!userData.firstName?.trim()) errs.firstName = 'Nombres obligatorios';
    if (!userData.lastName?.trim()) errs.lastName = 'Apellidos obligatorios';
    if (!userData.documentId?.trim()) errs.documentId = 'DNI obligatorio';

    // Perfil
    if (!studentProfileData.modality) errs.modality = 'Selecciona una modalidad';
    if (!studentProfileData.schedule) errs.schedule = 'Selecciona un turno';
    if (showGroupField && !studentProfileData.group?.trim()) errs.group = 'Grupo obligatorio para esta modalidad';
    if (showSectionField && !studentProfileData.section) errs.section = 'Sección obligatoria para esta modalidad';

    // Pago
    const totalAmount = parseFloat(paymentAgreementData.totalAmount) || 0;
    if (!paymentAgreementData.totalAmount || isNaN(totalAmount) || totalAmount <= 0) errs.totalAmount = 'Monto total inválido';
    if (!paymentAgreementData.agreementType) errs.agreementType = 'Selecciona tipo de acuerdo';

    if (paymentAgreementData.agreementType === 'CUSTOM_PARTS') {
      const { installments } = paymentAgreementData;
      if (!installments || installments.length === 0) {
        errs.installments = 'Debes añadir al menos una cuota';
      } else {
        const sum = installments.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
        if (Math.abs(totalAmount - sum) > 0.01) {
          errs.installments = 'La suma de las cuotas debe coincidir con el monto total';
        }
        installments.forEach((it, i) => {
          if (!it.dueDate) errs[`installment_due_${it.id}`] = 'Fecha requerida';
          const amount = parseFloat(it.amount);
          if (!it.amount || isNaN(amount) || amount <= 0) {
            errs[`installment_amount_${it.id}`] = 'Monto inválido';
          }
        });
      }
    }

    dispatch({ type: ACTIONS.SET_VALIDATION_ERRORS, payload: errs });
    return Object.keys(errs).length === 0;
  }, [userData, studentProfileData, paymentAgreementData, showGroupField, showSectionField]);

  /* ---------- Submit (optimizado) ---------- */
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      dispatch({ type: ACTIONS.SET_ERROR, payload: null });
      dispatch({ type: ACTIONS.SET_SUCCESS, payload: null });

      if (!validate()) {
        dispatch({ type: ACTIONS.SET_ERROR, payload: 'Corrige los errores del formulario.' });
        return;
      }

      dispatch({ type: ACTIONS.SET_LOADING, payload: true });

      try {
        const payload = { userData, studentProfileData, paymentAgreementData, cycleId };

        let response;
        if (profileFile) {
          const form = new FormData();
          form.append('payload', JSON.stringify(payload));
          form.append('profilePicture', profileFile);
          response = await axiosInstance.post('/students/enrollment-multipart', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } else {
          response = await axiosInstance.post('/students/enrollment', payload);
        }

        const message = response?.data?.message || 'Estudiante matriculado exitosamente.';
        if (isMountedRef.current) {
          dispatch({ type: ACTIONS.SET_SUCCESS, payload: message });
          // Llamada a onSuccess sin timeout; el caller decide
          if (onSuccess) onSuccess();
        }
      } catch (err) {
        const msg = err?.response?.data?.error || err?.response?.data?.message || err.message || 'Error al matricular al estudiante.';
        console.error('Enrollment error:', err);
        if (isMountedRef.current) dispatch({ type: ACTIONS.SET_ERROR, payload: msg });
      } finally {
        if (isMountedRef.current) dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      }
    },
    [validate, userData, studentProfileData, paymentAgreementData, profileFile, cycleId, onSuccess]
  );

  const resetForm = useCallback(() => {
    dispatch({ type: ACTIONS.RESET_FORM });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  /* ---------- Render ---------- */
  return (
    <div className="enrollment-form-overlay" aria-modal="true" role="dialog">
      <div className="enrollment-form-modal">
        <div className="form-header">
          <h3 className="form-title">Matricular Nuevo Estudiante</h3>
          <button type="button" onClick={onClose} className="close-button" aria-label="Cerrar">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="enrollment-form" noValidate>
          <div className="form-sections-container">
            {/* Datos Personales */}
            <fieldset>
              <legend>Datos Personales</legend>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="firstName">Nombres *</label>
                  <input id="firstName" name="firstName" type="text" value={userData.firstName} onChange={(e) => handleInputChange(e, 'userData')} required aria-required="true" />
                  <FieldError>{validationErrors.firstName}</FieldError>
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">Apellidos *</label>
                  <input id="lastName" name="lastName" type="text" value={userData.lastName} onChange={(e) => handleInputChange(e, 'userData')} required />
                  <FieldError>{validationErrors.lastName}</FieldError>
                </div>

                <div className="form-group">
                  <label htmlFor="documentId">DNI *</label>
                  <input id="documentId" name="documentId" type="text" value={userData.documentId} onChange={(e) => handleInputChange(e, 'userData')} required />
                  <FieldError>{validationErrors.documentId}</FieldError>
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" value={userData.email} onChange={(e) => handleInputChange(e, 'userData')} />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Teléfono</label>
                  <input id="phone" name="phone" type="tel" value={userData.phone} onChange={(e) => handleInputChange(e, 'userData')} />
                </div>

                <div className="form-group">
                  <label htmlFor="address">Dirección</label>
                  <input id="address" name="address" type="text" value={userData.address} onChange={(e) => handleInputChange(e, 'userData')} />
                </div>

                <div className="form-group profile-upload">
                  <label htmlFor="profilePicture">Foto de Perfil (opcional)</label>
                  <input ref={fileInputRef} id="profilePicture" name="profilePicture" type="file" accept="image/*" onChange={handleProfileFile} />
                  {profilePreviewUrl ? (
                    <div className="profile-preview">
                      <img src={profilePreviewUrl} alt="Vista previa" />
                      <button type="button" onClick={removeProfilePicture} className="remove-preview">Eliminar</button>
                    </div>
                  ) : (
                    <input id="profilePictureUrl" type="url" name="profilePictureUrl" placeholder="o pega la URL de la foto" value={userData.profilePictureUrl} onChange={(e) => handleInputChange(e, 'userData')} />
                  )}
                </div>
              </div>
            </fieldset>

            {/* Perfil de Estudiante */}
            <fieldset>
              <legend>Perfil de Estudiante</legend>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="modality">Modalidad *</label>
                  <select id="modality" name="modality" value={studentProfileData.modality} onChange={(e) => handleInputChange(e, 'studentProfileData')} required>
                    <option value="">Selecciona...</option>
                    {MODALITIES.map((mod) => <option key={mod} value={mod}>{LABELS[mod] || mod}</option>)}
                  </select>
                  <FieldError>{validationErrors.modality}</FieldError>
                </div>

                <div className="form-group">
                  <label htmlFor="schedule">Turno *</label>
                  <select id="schedule" name="schedule" value={studentProfileData.schedule} onChange={(e) => handleInputChange(e, 'studentProfileData')} required>
                    <option value="">Selecciona...</option>
                    {SCHEDULES.map((sch) => <option key={sch} value={sch}>{LABELS[sch] || sch}</option>)}
                  </select>
                  <FieldError>{validationErrors.schedule}</FieldError>
                </div>

                <div className="form-group">
                  <label htmlFor="age">Edad</label>
                  <input id="age" name="age" type="number" min="3" max="120" value={studentProfileData.age || ''} onChange={(e) => handleInputChange(e, 'studentProfileData', { numeric: true, integer: true })} />
                </div>

                <div className="form-group">
                  <label htmlFor="schoolOfOrigin">Colegio de Procedencia</label>
                  <input id="schoolOfOrigin" name="schoolOfOrigin" type="text" value={studentProfileData.schoolOfOrigin} onChange={(e) => handleInputChange(e, 'studentProfileData')} />
                </div>

                {showGroupField && (
                  <div className="form-group">
                    <label htmlFor="group">Grupo (A, B, C...) *</label>
                    <input id="group" name="group" type="text" value={studentProfileData.group} onChange={(e) => handleInputChange(e, 'studentProfileData')} required />
                    <FieldError>{validationErrors.group}</FieldError>
                  </div>
                )}

                {showSectionField && (
                  <div className="form-group">
                    <label htmlFor="section">Sección (1, 2, 3...) *</label>
                    <input id="section" name="section" type="number" value={studentProfileData.section} onChange={(e) => handleInputChange(e, 'studentProfileData', { numeric: true, integer: true })} required />
                    <FieldError>{validationErrors.section}</FieldError>
                  </div>
                )}
              </div>
            </fieldset>

            {/* Acuerdo de Pago */}
            <fieldset>
              <legend>Acuerdo de Pago</legend>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="totalAmount">Monto Total (S/) *</label>
                  <input id="totalAmount" name="totalAmount" type="number" step="0.01" min="0" value={paymentAgreementData.totalAmount || ''} onChange={(e) => handleInputChange(e, 'paymentAgreementData', { numeric: true })} required />
                  <FieldError>{validationErrors.totalAmount}</FieldError>
                </div>

                <div className="form-group">
                  <label htmlFor="agreementType">Tipo de Acuerdo *</label>
                  <select id="agreementType" name="agreementType" value={paymentAgreementData.agreementType} onChange={(e) => handleInputChange(e, 'paymentAgreementData')} required>
                    <option value="">Selecciona...</option>
                    {PAYMENT_AGREEMENT_TYPES.map((t) => <option key={t} value={t}>{LABELS[t] || t}</option>)}
                  </select>
                  <FieldError>{validationErrors.agreementType}</FieldError>
                </div>
              </div>

              {paymentAgreementData.agreementType === 'CUSTOM_PARTS' && (
                <div className="installments-section">
                  <h4>Cuotas Personalizadas</h4>
                  <div className="installments-list">
                    {paymentAgreementData.installments.map((installment) => (
                      <div key={installment.id} className="installment-item">
                        <div className="form-group">
                          <label>Fecha de Vencimiento</label>
                          <input type="date" value={installment.dueDate} onChange={(e) => handleInstallmentChange(installment.id, 'dueDate', e.target.value)} />
                          <FieldError>{validationErrors[`installment_due_${installment.id}`]}</FieldError>
                        </div>

                        <div className="form-group">
                          <label>Monto (S/)</label>
                          <input type="number" step="0.01" value={installment.amount || ''} onChange={(e) => handleInstallmentChange(installment.id, 'amount', e.target.value)} />
                          <FieldError>{validationErrors[`installment_amount_${installment.id}`]}</FieldError>
                        </div>

                        <button type="button" onClick={() => removeInstallment(installment.id)} className="remove-installment-button" title="Eliminar cuota">✕</button>
                      </div>
                    ))}
                  </div>

                  {validationErrors.installments && <div className="field-error">{validationErrors.installments}</div>}

                  <div className="installments-actions">
                    <button type="button" onClick={addInstallment} className="add-installment-button">+ Añadir Cuota</button>
                  </div>
                </div>
              )}
            </fieldset>
          </div>

          {error && <div className="error-message" role="alert">{error}</div>}
          {successMessage && <div className="success-message" role="status">{successMessage}</div>}

          <div className="form-actions">
            <button type="button" onClick={resetForm} className="cancel-button" disabled={loading}>Limpiar</button>
            <div>
              <button type="button" onClick={onClose} className="cancel-button" disabled={loading}>Cancelar</button>
              <button type="submit" disabled={loading} className="submit-button">{loading ? 'Procesando...' : 'Matricular Estudiante'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- PropTypes ---------- */
EnrollmentForm.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  cycleId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
EnrollmentForm.defaultProps = {
  onSuccess: null,
  cycleId: null,
};
