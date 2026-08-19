import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { simulationService } from '../../services/simulationService';
import styles from './SimulationResultsViewer.module.css';

const IMPORT_TYPE_LABELS = {
  RAW: 'Respuestas crudas (procesado en sistema)',
  PROCESSED: 'Resultados ya procesados',
};

function SimulationResultsViewer({ activeCycleId, userRole }) {
  const { instanceId } = useParams();
  const [instanceMeta, setInstanceMeta] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalityFilter, setModalityFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');

  const fetchResults = useCallback(async () => {
    if (!activeCycleId) {
      setInstanceMeta(null);
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await simulationService.getSimulationResults(instanceId, activeCycleId);
      setInstanceMeta(data.instance || null);
      setResults(data.results || []);
    } catch (err) {
      setInstanceMeta(null);
      setResults([]);
      setError(err.response?.data?.error || 'Error al cargar resultados');
    } finally {
      setLoading(false);
    }
  }, [activeCycleId, instanceId]);

  useEffect(() => {
    if (instanceId) {
      fetchResults();
    }
  }, [fetchResults, instanceId]);

  const modalityOptions = useMemo(() => {
    const values = new Set(
      results
        .map((result) => result.student?.studentProfile?.modality)
        .filter(Boolean)
    );
    return ['', ...Array.from(values).sort()];
  }, [results]);

  const groupOptions = useMemo(() => {
    const values = new Set(
      results
        .map((result) => result.student?.studentProfile?.group)
        .filter(Boolean)
    );
    return ['', ...Array.from(values).sort()];
  }, [results]);

  const filteredResults = useMemo(
    () =>
      results.filter((result) => {
        const modality = result.student?.studentProfile?.modality || '';
        const group = result.student?.studentProfile?.group || '';

        if (modalityFilter && modality !== modalityFilter) {
          return false;
        }

        if (groupFilter && group !== groupFilter) {
          return false;
        }

        return true;
      }),
    [results, modalityFilter, groupFilter]
  );

  const handleExportResults = async () => {
    try {
      const blob = await simulationService.exportSimulationResults(instanceId, activeCycleId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `resultados_${instanceMeta?.fileName || instanceId}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al exportar:', err);
      alert('No se pudo exportar el archivo. Verifique que existan resultados.');
    }
  };

  const allowedRoles = ['matriculador', 'admin', 'kami'];
  if (!allowedRoles.includes(userRole)) {
    return <div className={styles.errorMessage}>Acceso denegado. Solo personal autorizado.</div>;
  }

  if (!activeCycleId) {
    return (
      <div className={styles.errorMessage}>
        Selecciona un ciclo en Matricula para ver resultados.
      </div>
    );
  }

  if (loading) {
    return <div className={styles.loadingMessage}>Cargando resultados...</div>;
  }

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  const segmentNames =
    filteredResults[0]?.scoresBySegment && typeof filteredResults[0].scoresBySegment === 'object'
      ? Object.keys(filteredResults[0].scoresBySegment)
      : [];

  return (
    <div className={styles.simulationResultsViewer}>
      <header className={styles.header}>
        <div>
          <h3>{instanceMeta?.event?.name || 'Resultados de simulacro'}</h3>
          <p className={styles.metaLine}>
            Archivo: <strong>{instanceMeta?.fileName || 'sin nombre'}</strong>
          </p>
          <p className={styles.metaLine}>
            Ciclo: <strong>{instanceMeta?.cycle?.name || 'N/A'}</strong>
            {' · '}
            Fecha:{' '}
            <strong>
              {instanceMeta?.uploadedAt
                ? new Date(instanceMeta.uploadedAt).toLocaleString('es-PE')
                : 'N/A'}
            </strong>
          </p>
          <p className={styles.metaLine}>
            Tipo:{' '}
            <strong>{IMPORT_TYPE_LABELS[instanceMeta?.importType] || 'No registrado'}</strong>
          </p>
          {instanceMeta?.importSummary && (
            <p className={styles.metaLine}>
              Resumen: importados{' '}
              <strong>{instanceMeta.importSummary.imported ?? instanceMeta.importSummary.processed ?? '-'}</strong>
              {instanceMeta.importSummary.missingCount !== undefined && (
                <>
                  {' · '}
                  no encontrados <strong>{instanceMeta.importSummary.missingCount}</strong>
                </>
              )}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleExportResults}
          disabled={results.length === 0}
          className={styles.exportButton}
        >
          Exportar a Excel
        </button>
      </header>

      <div className={styles.filtersRow}>
        <label>
          Modalidad
          <select value={modalityFilter} onChange={(e) => setModalityFilter(e.target.value)}>
            <option value="">Todas</option>
            {modalityOptions.filter(Boolean).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Grupo
          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
            <option value="">Todos</option>
            {groupOptions.filter(Boolean).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.tableContainer}>
        {filteredResults.length > 0 ? (
          <table className={styles.resultsTable}>
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Documento</th>
                <th>Modalidad</th>
                <th>Grupo</th>
                <th>Puntaje</th>
                {segmentNames.map((name) => (
                  <th key={name}>{name}</th>
                ))}
                <th>Nota</th>
                <th>Puesto</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((result) => (
                <tr key={result.id || result.student?.documentId}>
                  <td className={styles.studentName}>
                    {result.student?.firstName} {result.student?.lastName}
                  </td>
                  <td>{result.student?.documentId}</td>
                  <td>{result.student?.studentProfile?.modality || '-'}</td>
                  <td>{result.student?.studentProfile?.group || '-'}</td>
                  <td className={styles.highlightScore}>{result.totalScore}</td>
                  {segmentNames.map((name) => (
                    <td key={name}>{result.scoresBySegment?.[name] ?? '-'}</td>
                  ))}
                  <td className={styles.notaCell}>
                    {instanceMeta?.event?.totalQuestions > 0
                      ? ((result.totalScore * 20) / instanceMeta.event.totalQuestions).toFixed(2)
                      : '-'}
                  </td>
                  <td className={styles.rankCell}>{result.rank ?? 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.noData}>No hay resultados para los filtros seleccionados.</p>
        )}
      </div>
    </div>
  );
}

export default SimulationResultsViewer;
