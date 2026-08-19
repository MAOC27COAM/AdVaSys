import React, { useEffect, useState } from 'react';
import { simulationService } from '../../services/simulationService';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import styles from './SimulationInstanceUpload.module.css';
import AnswerKeyModal from './AnswerKeyModal';

function SimulationInstanceUpload({
  activeCycleId,
  userRole,
  eventId,
  simulationEvent,
  modalityName,
  onUploadComplete,
}) {
  const [instanceName, setInstanceName] = useState('');
  const [file, setFile] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAnswerKeyModal, setShowAnswerKeyModal] = useState(false);
  const [currentAnswerKey, setCurrentAnswerKey] = useState({});
  const navigate = useNavigate();

  const resetUploadForm = () => {
    setInstanceName('');
    setFile(null);
    setValidationResults(null);
    setError('');
  };

  useEffect(() => {
    if (simulationEvent && simulationEvent.answerKey) {
      setCurrentAnswerKey(simulationEvent.answerKey);
    }
    resetUploadForm();
  }, [simulationEvent, activeCycleId]);

  const validateCommonInputs = () => {
    if (!activeCycleId) {
      setError('Selecciona un ciclo activo antes de subir resultados.');
      return false;
    }

    if (!instanceName.trim()) {
      setError('Debe proporcionar un nombre para este conjunto de resultados.');
      return false;
    }

    if (!file) {
      setError('Debe seleccionar un archivo Excel.');
      return false;
    }

    return true;
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) {
      return;
    }

    setFile(selectedFile);
    setValidationResults(null);
    setError('');
    event.target.value = '';
  };

  const handlePrepareStandardUpload = async () => {
    if (!validateCommonInputs() || !simulationEvent) {
      return;
    }

    setLoading(true);
    setError('');
    setValidationResults(null);

    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });

      const codes = json.slice(1)
        .map((row) => String(row[0] || '').trim())
        .filter((code) => code !== '');

      if (codes.length === 0) {
        throw new Error('No se encontraron codigos de estudiante.');
      }

      const results = await simulationService.validateStudentCodes(codes, activeCycleId);
      setValidationResults(results);
    } catch (err) {
      console.error('Error en el proceso:', err);
      setError(err.response?.data?.error || err.message || 'Error durante la validacion del archivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportProcessed = async () => {
    if (!validateCommonInputs()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('instanceName', instanceName.trim());
      formData.append('cycleId', String(activeCycleId));
      formData.append('file', file);

      const response = await simulationService.importProcessedSimulationResults(eventId, formData);

      if (onUploadComplete) {
        await onUploadComplete(eventId);
      }

      resetUploadForm();
      navigate('/dashboard/simulacros', {
        state: {
          uploadSuccess: true,
          instanceId: response.instanceId,
          eventId,
        },
      });
    } catch (err) {
      console.error('Error al importar resultados procesados:', err);
      setError(err.response?.data?.error || 'Error al importar los resultados procesados.');
      setLoading(false);
    }
  };

  const handleSaveAnswerKey = async (answerKey) => {
    setError('');
    setLoading(true);
    try {
      await simulationService.saveEventAnswerKey(eventId, answerKey);
      setCurrentAnswerKey(answerKey);
      setShowAnswerKeyModal(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar la clave de respuestas.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessResults = async () => {
    if (!validationResults) {
      setError('Primero debe analizar el archivo para validar los codigos.');
      return;
    }
    if (!file) {
      setError('Debe seleccionar un archivo Excel.');
      return;
    }
    if (!currentAnswerKey || Object.keys(currentAnswerKey).length < simulationEvent.totalQuestions) {
      setError(`Debes definir la clave para las ${simulationEvent.totalQuestions} preguntas.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('instanceName', instanceName.trim());
      formData.append('cycleId', String(activeCycleId));
      formData.append('file', file);

      const response = await simulationService.processRawSimulationResults(eventId, formData);
      const newInstanceId = response.instanceId;

      if (onUploadComplete) {
        await onUploadComplete(eventId);
      }

      resetUploadForm();
      navigate(`/dashboard/simulacros/resultados/${newInstanceId}`, {
        state: { uploadSuccess: true },
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar los resultados.');
      setLoading(false);
    }
  };

  if (userRole !== 'matriculador' && userRole !== 'admin' && userRole !== 'kami') {
    return <div className={styles.accessDenied}><p>Acceso denegado.</p></div>;
  }

  if (!activeCycleId) {
    return <div className={styles.loadingMessage}><p>Selecciona un ciclo en Matricula antes de subir resultados.</p></div>;
  }

  if (!simulationEvent) {
    return <div className={styles.loadingMessage}><p>Cargando evento...</p></div>;
  }

  return (
    <div className={styles.simulationInstanceUpload}>
      <div className={styles.header}>
        <h3>{modalityName}</h3>
        <h2>Subir Nuevos Resultados</h2>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}
      {loading && <div className={styles.loadingMessage}>Cargando...</div>}

      <div className={styles.formGroup}>
        <label htmlFor="instanceName">Nombre para este conjunto de resultados</label>
        <input
          type="text"
          id="instanceName"
          value={instanceName}
          onChange={(event) => setInstanceName(event.target.value)}
          placeholder="Ej: Resultados del 15 de Julio"
          className={styles.nameInput}
          disabled={loading}
        />
      </div>

      <div className={styles.uploadControls}>
        <div className={styles.uploadArea}>
          <label htmlFor="file-upload" className={`${styles.uploadLabel} ${!instanceName.trim() ? styles.disabledLabel : ''}`}>
            <span className={styles.excelIcon}>Archivo</span>
            {instanceName.trim() ? 'Seleccionar archivo Excel' : 'Primero ingrese un nombre'}
            <input
              type="file"
              id="file-upload"
              accept=".csv, .xls, .xlsx"
              onChange={handleFileChange}
              disabled={!instanceName.trim() || loading}
            />
          </label>
        </div>
        <div className={styles.actionColumn}>
          <button
            onClick={() => setShowAnswerKeyModal(true)}
            disabled={loading || !simulationEvent}
            className={styles.secondaryButton}
          >
            Llenar respuestas
          </button>
          <button
            onClick={handlePrepareStandardUpload}
            disabled={loading || !file}
            className={styles.secondaryButton}
          >
            Analizar archivo (respuestas crudas)
          </button>
          <button
            onClick={handleImportProcessed}
            disabled={loading || !file}
            className={styles.processedButton}
          >
            Importar resultados procesados
          </button>
        </div>
      </div>
      {file && <p className={styles.fileName}>Archivo seleccionado: <strong>{file.name}</strong></p>}

      {validationResults && (
        <div className={styles.validationSection}>
          <h4>Analisis del archivo</h4>
          <div className={styles.tableContainer}>
            <table className={styles.previewTable}>
              <thead><tr><th>Codigo</th><th>Estado</th></tr></thead>
              <tbody>
                {validationResults.map((result, index) => (
                  <tr
                    key={`${result.code}-${index}`}
                    className={result.status === 'FOUND' ? styles.found : styles.notFound}
                  >
                    <td>{result.code}</td>
                    <td>{result.label || (result.found ? 'Encontrado' : 'No encontrado')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className={styles.finalAction}>
        <button
          onClick={handleProcessResults}
          disabled={loading || !validationResults || !file || Object.keys(currentAnswerKey).length === 0}
          className={styles.successButton}
        >
          Procesar y guardar resultados
        </button>
      </div>

      {showAnswerKeyModal && (
        <AnswerKeyModal
          totalQuestions={simulationEvent.totalQuestions}
          initialAnswerKey={currentAnswerKey}
          onSave={handleSaveAnswerKey}
          onClose={() => setShowAnswerKeyModal(false)}
        />
      )}
    </div>
  );
}

export default SimulationInstanceUpload;
