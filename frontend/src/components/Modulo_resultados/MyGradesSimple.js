import React, { useEffect, useState } from 'react';
import { gradeService } from '../../services/gradeService';
import { useAuth } from '../../context/AuthContext';
import styles from './MyGradesSimple.module.css';

function MyGradesSimple() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [simulationResults, setSimulationResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthLoading && user?.role?.name === 'student') {
      fetchSimulationResults();
    }

    if (!isAuthLoading && user?.role?.name !== 'student') {
      setLoading(false);
    }
  }, [isAuthLoading, user]);

  const fetchSimulationResults = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await gradeService.getStudentSimulationResults();
      setSimulationResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar tus resultados.');
    } finally {
      setLoading(false);
    }
  };

  const getRankBadgeClass = (rank) => {
    if (!rank) return styles.rankOther;
    if (rank <= 3) return styles.rankTop3;
    if (rank <= 10) return styles.rankTop10;
    return styles.rankOther;
  };

  if (isAuthLoading || loading) {
    return <div className={styles.loadingMessage}>Cargando tus resultados...</div>;
  }

  if (user?.role?.name !== 'student') {
    return (
      <div className={styles.accessDenied}>
        <p>Acceso denegado.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorMessage}>
        <p>Error: {error}</p>
      </div>
    );
  }

  const averageNota =
    simulationResults.length > 0
      ? (
          simulationResults.reduce((sum, r) => {
            const nota = r.totalQuestions > 0 ? (r.score * 20) / r.totalQuestions : 0;
            return sum + nota;
          }, 0) / simulationResults.length
        ).toFixed(2)
      : '0.00';

  const averageScore =
    simulationResults.length > 0
      ? (
          simulationResults.reduce((sum, r) => sum + r.score, 0) / simulationResults.length
        ).toFixed(2)
      : '0.00';

  if (simulationResults.length === 0) {
    return (
      <div className={styles.noResultsMessage}>
        <p>No tienes resultados disponibles.</p>
      </div>
    );
  }

  return (
    <div className={styles.myGradesModule}>
      <h3 className= {styles.moduleTitle}>Mis Resultados</h3>

      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{averageNota}</span>
          <span className={styles.summaryLabel}>Nota Promedio</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{averageScore}</span>
          <span className={styles.summaryLabel}>Puntaje Promedio</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{simulationResults.length}</span>
          <span className={styles.summaryLabel}>Simulacros</span>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.resultsTable}>
          <thead>
            <tr>
              <th>Evento</th>
              <th>Ciclo</th>
              <th>Fecha</th>
              <th>Puntaje</th>
              <th>Nota</th>
              <th>Puesto global</th>
              <th>Puesto modalidad</th>
              <th>Puesto grupo</th>
            </tr>
          </thead>
          <tbody>
            {simulationResults.map((result) => {
              const formattedDate = new Date(result.date).toLocaleDateString('es-PE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              });
              const nota = result.totalQuestions > 0
                ? ((result.score * 20) / result.totalQuestions).toFixed(2)
                : '-';

              return (
                <tr key={result.id}>
                  <td>{result.eventName}</td>
                  <td>{result.cycleName || '-'}</td>
                  <td>{formattedDate}</td>
                  <td>{result.score}</td>
                  <td className={styles.notaCell}>{nota}</td>
                  <td>
                    <span className={`${styles.rankBadge} ${getRankBadgeClass(result.rank)}`}>
                      {result.rank || '-'}
                    </span>
                  </td>
                  <td>{result.rankByModality ?? '-'}</td>
                  <td>{result.rankByGroup ?? '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MyGradesSimple;
