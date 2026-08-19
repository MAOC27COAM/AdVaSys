import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { simulationService } from '../../services/simulationService';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import styles from './EstadoAcademicoView.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function EstadoAcademicoView({ activeCycleId }) {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!activeCycleId || !studentId) return;
    fetchData();
  }, [activeCycleId, studentId]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await simulationService.getStudentAcademicStatus(studentId, activeCycleId);
      setData(result);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar estado académico.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loadingMessage}>Cargando estado académico...</div>;
  }

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  if (!data) {
    return <div className={styles.errorMessage}>No se encontraron datos del alumno.</div>;
  }

  const hasSegmentData = data.results.some(
    (r) => r.scoresBySegment && Object.keys(r.scoresBySegment).length > 0
  );
  const segmentKeys = hasSegmentData && data.results.length > 0
    ? Object.keys(data.results[0].scoresBySegment || {})
    : [];

  const chartLabels = [...data.results].reverse().map((r) => {
    const d = new Date(r.date);
    return `${d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}`;
  });

  const chartDataObj = {
    labels: chartLabels,
    datasets: [{
      label: 'Puntaje',
      data: [...data.results].reverse().map((r) => r.totalScore),
      borderColor: '#f97316',
      backgroundColor: 'rgba(249, 115, 22, 0.1)',
      fill: true,
      tension: 0.3,
      pointBackgroundColor: '#f97316',
      pointRadius: 4,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.parsed.y} pts`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', maxRotation: 45 },
        grid: { display: false },
      },
      y: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
    },
  };

  const handleExport = () => {
    const rows = data.results.map((r) => ({
      'Fecha de subida': new Date(r.date).toLocaleDateString('es-PE', {
        year: 'numeric', month: '2-digit', day: '2-digit',
      }),
      'Nombre de instancia': r.fileName,
      Puntaje: r.totalScore,
      Nota: r.totalQuestions > 0 ? parseFloat(((r.totalScore * 20) / r.totalQuestions).toFixed(2)) : '-',
      Puesto: r.rank ?? '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estado Academico');
    XLSX.writeFile(wb, `estado_academico_${data.student.documentId}.xlsx`);
  };

  return (
    <div className={styles.container}>
      <button onClick={() => navigate('/dashboard/simulacros')} className={styles.backButton}>
        &larr; Volver a Simulacros
      </button>

      <div className={styles.studentInfo}>
        <div>
          <h2 className={styles.studentName}>
            {data.student.firstName} {data.student.lastName}
          </h2>
          <p className={styles.studentMeta}>
            DNI: {data.student.documentId}
          </p>
        </div>
        <div className={styles.studentBadges}>
          {data.student.modality && <span className={styles.badge}>{data.student.modality}</span>}
          {data.student.group && <span className={styles.badge}>Grupo {data.student.group}</span>}
        </div>
      </div>

      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{data.summary.averageScore.toFixed(2)}</span>
          <span className={styles.summaryLabel}>Puntaje Promedio</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{data.summary.simulacrosCount}</span>
          <span className={styles.summaryLabel}>Simulacros Registrados</span>
        </div>
      </div>

      {data.results.length > 1 && (
        <div className={styles.chartContainer}>
          <h3 className={styles.sectionTitle}>Evolución de Puntaje</h3>
          <Line data={chartDataObj} options={chartOptions} />
        </div>
      )}

      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Historial de Resultados</h3>
        {data.results.length > 0 && (
          <button onClick={handleExport} className={styles.exportButton}>
            Exportar a Excel
          </button>
        )}
      </div>
      <div className={styles.tableWrapper}>
        {data.results.length === 0 ? (
          <p className={styles.noResults}>Este alumno no tiene resultados en el ciclo seleccionado.</p>
        ) : (
          <table className={styles.resultsTable}>
            <thead>
              <tr>
                <th>Instancia</th>
                <th>Fecha</th>
                <th>Puntaje</th>
                {segmentKeys.map((seg) => (
                  <th key={seg}>{seg}</th>
                ))}
                <th>Nota</th>
                <th>Puesto</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((r) => {
                const segValues = segmentKeys.map((k) => r.scoresBySegment?.[k]);
                return (
                  <tr key={r.id}>
                    <td className={styles.eventCell}>{r.fileName}</td>
                    <td className={styles.dateCell}>
                      {new Date(r.date).toLocaleDateString('es-PE', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                      })}
                    </td>
                    <td className={styles.scoreCell}>{r.totalScore}</td>
                    {segValues.map((val, i) => (
                      <td
                        key={i}
                        className={`${styles.segmentCell} ${val != null && val >= 0 ? styles.segmentPositive : styles.segmentNegative}`}
                      >
                        {val != null ? val : '-'}
                      </td>
                    ))}
                    <td className={styles.notaCell}>
                      {r.totalQuestions > 0 ? ((r.totalScore * 20) / r.totalQuestions).toFixed(2) : '-'}
                    </td>
                    <td>
                      <span className={`${styles.rankBadge} ${r.rank <= 3 ? styles.rankTop3 : r.rank <= 10 ? styles.rankTop10 : ''}`}>
                        {r.rank ?? '-'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default EstadoAcademicoView;
