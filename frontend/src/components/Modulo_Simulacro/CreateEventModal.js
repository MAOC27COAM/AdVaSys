import React, { useState, useCallback } from 'react';
import styles from './CreateEventModal.module.css';

const NUMERO_PREGUNTAS = ['20', '40', '60', '80', '100'];

const INITIAL_STATE = {
  name: '',
  totalQuestions: '100',
  thematicSeparation: [{ tema: '', inicio: '', fin: '' }],
};

function CreateEventModal({ isOpen, onClose, onSave, activeCycleId }) {
  const [newEvent, setNewEvent] = useState(INITIAL_STATE);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = useCallback(({ target }) => {
    const { name, value } = target;
    setNewEvent((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleThematicChange = useCallback((index, field, value) => {
    setNewEvent((prev) => {
      const thematic = [...prev.thematicSeparation];
      thematic[index] = { ...thematic[index], [field]: value };
      return { ...prev, thematicSeparation: thematic };
    });
  }, []);

  const addThematicRow = useCallback(() => {
    setNewEvent((prev) => ({
      ...prev,
      thematicSeparation: [...prev.thematicSeparation, { tema: '', inicio: '', fin: '' }],
    }));
  }, []);

  const removeThematicRow = useCallback((index) => {
    setNewEvent((prev) => ({
      ...prev,
      thematicSeparation: prev.thematicSeparation.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!activeCycleId) {
      setError('Selecciona un ciclo en Matricula antes de crear un evento.');
      return;
    }

    if (!newEvent.name.trim()) {
      setError('El nombre del evento es obligatorio.');
      return;
    }

    setLoading(true);

    const payload = {
      cycleId: activeCycleId,
      name: newEvent.name.trim(),
      totalQuestions: Number(newEvent.totalQuestions),
      thematicSeparation: newEvent.thematicSeparation,
    };

    try {
      await onSave(payload);
      setNewEvent(INITIAL_STATE);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al guardar el evento.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button type="button" onClick={onClose} className={styles.closeButton}>
          &times;
        </button>
        <h3>Crear nuevo evento de simulacro</h3>
        <p className={styles.modalHint}>El evento quedara asociado al ciclo activo seleccionado en Matricula.</p>

        {error && <p className={styles.errorMessage}>{error}</p>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Nombre del evento</label>
            <input name="name" value={newEvent.name} onChange={handleChange} required />
          </div>

          <div className={styles.formGroup}>
            <label>Numero de preguntas</label>
            <div className={styles.radioContainer}>
              {NUMERO_PREGUNTAS.map((num) => (
                <label key={num}>
                  <input
                    type="radio"
                    name="totalQuestions"
                    value={num}
                    checked={newEvent.totalQuestions === num}
                    onChange={handleChange}
                  />
                  {num}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Tematica por rango (opcional)</label>
            {newEvent.thematicSeparation.map((row, index) => (
              <div key={index} className={styles.thematicRow}>
                <input
                  placeholder="Tema"
                  value={row.tema}
                  onChange={(e) => handleThematicChange(index, 'tema', e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Inicio"
                  value={row.inicio}
                  onChange={(e) => handleThematicChange(index, 'inicio', e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Fin"
                  value={row.fin}
                  onChange={(e) => handleThematicChange(index, 'fin', e.target.value)}
                />
                {newEvent.thematicSeparation.length > 1 && (
                  <button type="button" onClick={() => removeThematicRow(index)}>
                    &times;
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={addThematicRow}>
              + Anadir tema
            </button>
          </div>

          <div className={styles.formActions}>
            <button type="button" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateEventModal;
