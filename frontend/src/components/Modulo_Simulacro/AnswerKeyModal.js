import React, { useState, useEffect } from 'react';
import styles from './SimulationInstanceUpload.module.css'; // Reutilizando estilos por ahora

const AnswerKeyModal = ({ totalQuestions, initialAnswerKey, onSave, onClose }) => {
  const [answers, setAnswers] = useState(initialAnswerKey);

  useEffect(() => {
    setAnswers(initialAnswerKey);
  }, [initialAnswerKey]);

  const handleAnswerChange = (qNum, value) => {
    setAnswers(prev => ({ ...prev, [qNum]: value.toUpperCase() }));
  };

  const saveAndClose = () => {
    onSave(answers);
  };

  const options = ['A', 'B', 'C', 'D', 'E']; // Opciones comunes, ajustar si es necesario
  const filasDeseadas = 25//Math.ceil(totalQuestions / 6); // Ajustar número de filas según total de preguntas
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h4>Definir Clave de Respuestas</h4>
        <p>Introduce la alternativa correcta para cada pregunta.</p>
        <div className={styles.answerKeyGrid} style={{ gridTemplateRows: `repeat(${filasDeseadas}, auto)` }}>
          {Array.from({ length: totalQuestions }, (_, i) => i + 1).map(qNum => (
            <div key={qNum} className={styles.questionInput}>
              <label>{qNum}.</label>
              <select
                value={answers[qNum] || ''}
                onChange={(e) => handleAnswerChange(qNum, e.target.value)}
              >
                <option value="">-</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className={styles.modalActions}>
          <button onClick={saveAndClose} className={styles.primaryButton}>Guardar Clave</button>
          <button onClick={onClose} className={styles.secondaryButton}>Cancelar</button>
        </div>
      </div>
    </div>
  );
};

export default AnswerKeyModal;
