import React, { useState } from 'react';
import axios from 'axios';
import { ROLES, STUDENT_MODALITIES, SCHEDULES, INVESTMENT_TYPES } from '../utils/constants';
import styles from './RegistrationForm.module.css';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000/api";

function RegistrationForm() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState('student');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roleName: 'student',
  });

  const [profileData, setProfileData] = useState({
    modality: STUDENT_MODALITIES[0],
    schedule: SCHEDULES[0],
    investment: INVESTMENT_TYPES[0],
    startDate: '',
    employmentStatus: '',
    specialty: '',
    academicDegree: '',
  });

  const [message, setMessage] = useState({ type: '', content: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleSelect = (e) => {
    const role = e.target.value;
    setSelectedRole(role);
    setFormData((prev) => ({ ...prev, roleName: role }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', content: '' });
    setIsLoading(true);

    const token = localStorage.getItem('token');
    if (!token) {
      setMessage({ type: 'error', content: 'No estás autenticado. Por favor, inicia sesión de nuevo.' });
      setIsLoading(false);
      return;
    }

    const payload = {
      ...formData,
      profileData: {},
    };

    if (formData.roleName === 'student') {
      payload.profileData = {
        modality: profileData.modality,
        schedule: profileData.schedule,
        investment: profileData.investment,
      };
    } else if (formData.roleName === 'teacher') {
      payload.profileData = {
        startDate: profileData.startDate,
        employmentStatus: profileData.employmentStatus,
        specialty: profileData.specialty,
        academicDegree: profileData.academicDegree,
      };
    }

    try {
      await axios.post(`${API_URL}/users/create`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage({ type: 'success', content: `Usuario '${formData.email}' creado exitosamente.` });
      
      // Reset form
      setFormData({ firstName: '', lastName: '', email: '', password: '', roleName: selectedRole });
      setProfileData({
        modality: STUDENT_MODALITIES[0],
        schedule: SCHEDULES[0],
        investment: INVESTMENT_TYPES[0],
        startDate: '',
        employmentStatus: '',
        specialty: '',
        academicDegree: '',
      });
      setShowCreateForm(false);
    } catch (err) {
      setMessage({ type: 'error', content: err.response?.data?.error || 'Ocurrió un error al crear el usuario.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setFormData({ firstName: '', lastName: '', email: '', password: '', roleName: selectedRole });
    setProfileData({
      modality: STUDENT_MODALITIES[0],
      schedule: SCHEDULES[0],
      investment: INVESTMENT_TYPES[0],
      startDate: '',
      employmentStatus: '',
      specialty: '',
      academicDegree: '',
    });
    setMessage({ type: '', content: '' });
  };

  return (
    <div className={styles.registrationContainer}>
      {message.content && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.content}
        </div>
      )}

      {/* Línea 1: Selector de tipo de usuario */}
      <div className="user-type-row">
        <label htmlFor="role-select">Tipo de Usuario:</label>
        <select 
          id="role-select"
          value={selectedRole}
          onChange={handleRoleSelect}
          className="role-select"
          disabled={showCreateForm}
        >
          {ROLES.map((role) => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </select>
      </div>

      {/* Línea 2: Botón o formulario de creación */}
      <div className="create-user-row">
        {!showCreateForm ? (
          <button 
            onClick={() => setShowCreateForm(true)} 
            className="toggle-create-btn"
          >
            + Crear Nuevo {ROLES.find(r => r.value === selectedRole)?.label}
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="inline-user-form">
            {/* Campos comunes */}
            <input 
              type="text" 
              name="firstName" 
              value={formData.firstName} 
              onChange={handleFormChange} 
              className="inline-input" 
              required 
              placeholder="Nombres"
            />
            
            <input 
              type="text" 
              name="lastName" 
              value={formData.lastName} 
              onChange={handleFormChange} 
              className="inline-input" 
              required 
              placeholder="Apellidos"
            />
            
            <input 
              type="email" 
              name="email" 
              value={formData.email} 
              onChange={handleFormChange} 
              className="inline-input" 
              required 
              placeholder="Email"
            />
            
            <input 
              type="password" 
              name="password" 
              value={formData.password} 
              onChange={handleFormChange} 
              className="inline-input" 
              required 
              placeholder="Contraseña"
            />

            {/* Campos específicos para Estudiante */}
            {formData.roleName === 'student' && (
              <>
                <select 
                  name="modality" 
                  value={profileData.modality} 
                  onChange={handleProfileChange} 
                  className="inline-select"
                >
                  {STUDENT_MODALITIES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>

                <select 
                  name="schedule" 
                  value={profileData.schedule} 
                  onChange={handleProfileChange} 
                  className="inline-select"
                >
                  {SCHEDULES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <select 
                  name="investment" 
                  value={profileData.investment} 
                  onChange={handleProfileChange} 
                  className="inline-select"
                >
                  {INVESTMENT_TYPES.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </>
            )}

            {/* Campos específicos para Docente */}
            {formData.roleName === 'teacher' && (
              <>
                <input 
                  type="date" 
                  name="startDate" 
                  value={profileData.startDate} 
                  onChange={handleProfileChange} 
                  className="inline-input" 
                  required 
                  placeholder="Fecha Ingreso"
                />

                <input 
                  type="text" 
                  name="employmentStatus" 
                  value={profileData.employmentStatus} 
                  onChange={handleProfileChange} 
                  className="inline-input" 
                  required 
                  placeholder="Condición Laboral"
                />

                <input 
                  type="text" 
                  name="specialty" 
                  value={profileData.specialty} 
                  onChange={handleProfileChange} 
                  className="inline-input" 
                  required 
                  placeholder="Especialidad"
                />

                <input 
                  type="text" 
                  name="academicDegree" 
                  value={profileData.academicDegree} 
                  onChange={handleProfileChange} 
                  className="inline-input" 
                  required 
                  placeholder="Grado Académico"
                />
              </>
            )}

            <button type="submit" disabled={isLoading} className="submit-btn">
              {isLoading ? 'Creando...' : 'Crear'}
            </button>
            
            <button 
              type="button" 
              onClick={handleCancel} 
              className="cancel-btn"
              disabled={isLoading}
            >
              Cancelar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default RegistrationForm;