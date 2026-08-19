// Importaciones de React, servicios y librerías de gráficos.
import React, { useState, useEffect } from 'react';
import { gradeService } from '../../services/gradeService'; // Servicio para la API de calificaciones.
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2'; // Componente para renderizar gráficos de línea.
import styles from './MyGrades.module.css'; // Estilos específicos.

// --- Registro de Componentes de Chart.js ---
// Es necesario registrar los componentes que se usarán en el gráfico para que Chart.js sepa cómo renderizarlos.
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

/**
 * Componente MyGrades: Muestra los resultados de los simulacros de un estudiante,
 * incluyendo una tabla detallada y un gráfico de progreso.
 * @param {object} props - Propiedades del componente.
 * @param {string} props.userRole - El rol del usuario actual.
 */
function MyGrades({ userRole }) {
  // --- Bloque de Declaración de Estados ---
  // Almacena los resultados de los simulacros obtenidos de la API.
  const [simulationResults, setSimulationResults] = useState([]);
  // Indica si se están cargando los datos.
  const [loading, setLoading] = useState(true);
  // Almacena mensajes de error.
  const [error, setError] = useState('');
  // Guarda la configuración de datos para el gráfico (etiquetas, datasets).
  const [chartData, setChartData] = useState({});
  // Guarda las opciones de configuración y estilo para el gráfico.
  const [chartOptions, setChartOptions] = useState({});

  // --- Efecto Secundario para Cargar Datos ---
  // Se ejecuta al montar el componente si el rol es 'student' para buscar sus resultados.
  useEffect(() => {
    if (userRole === 'student') {
      fetchSimulationResults();
    }
  }, [userRole]);

  /**
   * Obtiene los resultados de los simulacros del estudiante desde la API.
   */
  const fetchSimulationResults = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await gradeService.getStudentSimulationResults();
      setSimulationResults(data);
      processChartData(data); // Procesa los datos para el gráfico después de obtenerlos.
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar tus resultados de simulacros');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Transforma los resultados de la API en un formato compatible con Chart.js.
   * @param {Array} results - El array de resultados de simulacros.
   */
  const processChartData = (results) => {
    if (results.length === 0) return;

    // Extrae todas las temáticas únicas de todos los simulacros para crear las series del gráfico.
    const allThematics = new Set();
    results.forEach(res => {
      if (res.simulationInstance?.modality?.thematicSegments) {
        res.simulationInstance.modality.thematicSegments.forEach(segment => allThematics.add(segment.name));
      }
    });
    const thematics = Array.from(allThematics);

    // Crea las etiquetas para el eje X (fecha y nombre del simulacro).
    const labels = results.map(res => {
      const date = new Date(res.simulationInstance.uploadedAt);
      return `${date.toLocaleDateString()} - ${res.simulationInstance.modality.name}`;
    }).reverse(); // Se invierte para mostrar en orden cronológico.

    // Crea un dataset (una línea en el gráfico) por cada temática.
    const datasets = thematics.map((thematic, index) => {
      // Asigna un color único a cada línea del gráfico.
      const hue = (index * 137 + 57) % 360;
      const color = `hsl(${hue}, 70%, 50%)`;
      return {
        label: thematic,
        data: results.map(res => res.scoresBySegment?.[thematic] || 0).reverse(),
        borderColor: color,
        backgroundColor: color,
        tension: 0.1, // Suaviza las líneas.
      };
    });

    setChartData({ labels, datasets });
    setChartOptions({
      // Opciones de configuración del gráfico (título, leyenda, ejes, etc.).
    });
  };

  /**
   * Devuelve una clase CSS para el puesto (rank) para aplicar estilos especiales.
   * @param {number} rank - El puesto del estudiante en el simulacro.
   */
  const getRankBadgeClass = (rank) => {
    if (!rank) return null;
    if (rank <= 3) return styles.rankTop3;
    if (rank <= 10) return styles.rankTop10;
    return styles.rankOther;
  };

  // --- Bloques de Renderizado Condicional ---
  if (userRole && userRole !== 'student') {
    return <div className={styles.accessDenied}><p>Acceso denegadgfhvbjjnko.</p></div>;
  }
  if (loading) {
    return <div className={styles.loadingMessage}>Cargando tus resultados...</div>;
  }
  if (error) {
    return <div className={styles.errorMessage}><p>Error: {error}</p></div>;
  }
  if (simulationResults.length === 0) {
    return <div className={styles.noResultsMessage}><p>No tienes resultados disponibles.</p></div>;
  }

  // --- Preparación para el Renderizado Final ---
  // Extrae los encabezados de las temáticas del primer resultado para construir la tabla dinámicamente.
  const thematicHeaders = simulationResults.length > 0 && simulationResults[0].scoresBySegment
    ? Object.keys(simulationResults[0].scoresBySegment) : [];
  // Calcula el mejor puntaje para resaltarlo en la tabla.
  const bestScore = Math.max(...simulationResults.map(r => r.totalScore));

  // --- Renderizado Principal del Componente ---
  return (
    <div className={styles.myGradesModule}>
      <h3>Mis Resultados de Simulacros</h3>
      
      {/* Contenedor del Gráfico de Progreso */}
      {chartData.labels && chartData.datasets && (
        <div className={styles.chartContainer}>
          <Line data={chartData} options={chartOptions} />
        </div>
      )}

      <h4>Últimos Simulacros</h4>
      {/* Tabla de Resultados Detallados */}
      <div style={{ overflowX: 'auto' }}>
        <table className={styles.resultsTable}>
          <thead>
            {/* ... renderizado de encabezados ... */}
          </thead>
          <tbody>
            {simulationResults.map(result => {
              // ... lógica de renderizado de cada fila ...
              return (
                <tr key={result.id}>
                  {/* ... celdas de la tabla ... */}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MyGrades;