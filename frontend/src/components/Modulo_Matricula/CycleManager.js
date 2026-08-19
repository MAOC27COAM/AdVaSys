import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './CycleManager.module.css';
import { isCycleOperable } from '../../utils/cycleUtils';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function CycleManager({ onCycleSelected, activeCycleId }) {
  const [cycles, setCycles] = useState([]);
  const [newCycleName, setNewCycleName] = useState('');
  const [newCycleStartDate, setNewCycleStartDate] = useState('');
  const [newCycleEndDate, setNewCycleEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchCycles();
  }, []);

  const fetchCycles = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/cycles`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setCycles(response.data);
      
      if (response.data && response.data.length > 0) {
        const sortedCycles = [...response.data].sort((a, b) =>
          new Date(b.startDate) - new Date(a.startDate)
        );
        const mostRecentOperableCycle = sortedCycles.find((cycle) => isCycleOperable(cycle));

        if (mostRecentOperableCycle) {
          if (mostRecentOperableCycle.id !== activeCycleId) {
            onCycleSelected(mostRecentOperableCycle.id);
          }
        } else if (activeCycleId) {
          onCycleSelected('');
        }
      }
    } catch (err) {
      console.error('Error al cargar ciclos:', err);
      setError('Error al cargar los ciclos disponibles.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCycle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!newCycleName || !newCycleStartDate || !newCycleEndDate) {
      setError('Todos los campos del nuevo ciclo son obligatorios.');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/cycles`, {
        name: newCycleName,
        startDate: new Date(newCycleStartDate),
        endDate: new Date(newCycleEndDate),
        status: 'PLANNED',
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setSuccessMessage(`Ciclo '${response.data.name}' creado exitosamente.`);
      setNewCycleName('');
      setNewCycleStartDate('');
      setNewCycleEndDate('');
      setShowCreateForm(false);
      fetchCycles();
    } catch (err) {
      console.error('Error al crear ciclo:', err.response?.data || err);
      setError(err.response?.data?.error || 'Error al crear el ciclo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCycleChange = (e) => {
    const selectedId = parseInt(e.target.value);
    onCycleSelected(selectedId);
  };

  return (
    <div className={styles.cycleManagerContainer}>
      {error && <p className={styles.errorMessage}>❌ {error}</p>}
      {successMessage && <p className={styles.successMessage}>✅ {successMessage}</p>}

      {/* Selector de Ciclo */}
      <div className={styles.cycleRow}>
        <select 
          id="active-cycle-select"
          value={activeCycleId || ''}
          onChange={handleCycleChange}
          disabled={loading}
          className={styles.cycleSelect}
        >
          <option value="">-- Selecciona un Ciclo --</option>
          {cycles.map(cycle => (
            <option key={cycle.id} value={cycle.id}>
              {cycle.name} ({new Date(cycle.startDate).getFullYear()})
            </option>
          ))}
        </select>
      </div>

      {/* Sección de Creación */}
      <div className={styles.createCycleRow}>
        {!showCreateForm ? (
          <button 
            onClick={() => setShowCreateForm(true)} 
            className={styles.toggleCreateBtn}
            disabled={loading}
          >
            ➕ Crear Nuevo Ciclo
          </button>
        ) : (
          <form onSubmit={handleCreateCycle} className={styles.inlineCreateForm}>
            <input 
              type="text" 
              placeholder="Nombre del Ciclo (ej: 2024-I)" 
              value={newCycleName} 
              onChange={(e) => setNewCycleName(e.target.value)} 
              required 
              className={styles.inlineInput}
              disabled={loading}
            />
            <input 
              type="date" 
              value={newCycleStartDate} 
              onChange={(e) => setNewCycleStartDate(e.target.value)} 
              required 
              className={styles.inlineInput}
              disabled={loading}
              title="Fecha de Inicio"
            />
            <input 
              type="date" 
              value={newCycleEndDate} 
              onChange={(e) => setNewCycleEndDate(e.target.value)} 
              required 
              className={styles.inlineInput}
              disabled={loading}
              title="Fecha de Fin"
            />
            <button 
              type="submit" 
              disabled={loading} 
              className={styles.submitBtn}
            >
              {loading ? 'Creando...' : 'Crear'}
            </button>
            <button 
              type="button" 
              onClick={() => {
                setShowCreateForm(false);
                setNewCycleName('');
                setNewCycleStartDate('');
                setNewCycleEndDate('');
              }} 
              className={styles.cancelBtn}
              disabled={loading}
            >
              Cancelar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default CycleManager;
