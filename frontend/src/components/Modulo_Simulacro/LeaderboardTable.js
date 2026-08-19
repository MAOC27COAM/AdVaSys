import React from 'react';
import './LeaderboardTable.module.css'; // Asegúrate de que el estilo se importe correctamente, usé .module.css por convención

/**
 * Componente LeaderboardTable: Muestra una tabla de clasificación (leaderboard) para un simulacro específico.
 * Destaca los primeros puestos con medallas y organiza los participantes por puntaje.
 * @param {object} props - Propiedades del componente.
 * @param {string} props.examName - El nombre del examen o simulacro para el que se muestra la clasificación.
 * @param {Array<object>} props.entries - Un array de objetos con los datos de cada participante (studentName, rank, score).
 */
function LeaderboardTable({ examName, entries }) {
  // --- Bloque de Renderizado Condicional: Estado Vacío ---
  // Si no hay entradas (participantes) o el array está vacío, muestra un mensaje indicando que no hay datos.
  if (!entries || entries.length === 0) {
    return (
      <div className="leaderboard-empty">
        <div className="empty-icon">📊</div>
        <p>No hay datos disponibles para este simulacro.</p>
      </div>
    );
  }

  // --- Funciones Auxiliares para Estilos y Emojis ---
  /**
   * Devuelve una clase CSS para aplicar estilos de medalla (oro, plata, bronce) a los primeros puestos.
   * @param {number} rank - El puesto del participante.
   * @returns {string} La clase CSS correspondiente o una cadena vacía.
   */
  const getMedalClass = (rank) => {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return ''; // Sin clase especial para otros puestos.
  };

  /**
   * Devuelve un emoji de medalla para los primeros puestos, o el número del puesto para los demás.
   * @param {number} rank - El puesto del participante.
   * @returns {string|number} El emoji de medalla o el número de puesto.
   */
  const getMedalEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank; // Muestra el número para otros puestos.
  };

  // --- Renderizado del Componente ---
  return (
    <div className="leaderboard-container"> {/* Contenedor principal de la tabla de clasificación */}
      <div className="leaderboard-header"> {/* Encabezado de la tabla con título y contador */}
        <h3 className="leaderboard-title">{examName}</h3>
        <span className="leaderboard-count">{entries.length} participantes</span>
      </div>

      <div className="table-wrapper"> {/* Contenedor para hacer la tabla scrollable si es necesario */}
        <table className="leaderboard-table"> {/* Elemento tabla con estilos */}
          <thead>
            <tr>
              <th className="col-name">Estudiante</th>
              <th className="col-rank">Puntaje</th>              
              <th className="col-score">Nota</th>
            </tr>
          </thead>
          <tbody>
            {/* Mapea cada entrada (participante) a una fila de la tabla */}
            {entries.map((entry, index) => (
              <tr 
                key={entry.id || index} 
                className={`leaderboard-row ${getMedalClass(entry.rank)}`} // Aplica clase de medalla condicionalmente.
              >
                <td className="col-name">
                  <span className="student-name">{entry.studentName}</span>
                </td>
                <td className="col-rank">
                  <span className="rank-badge">
                    {getMedalEmoji(entry.rank)} {/* Muestra el emoji o número del puesto */}
                  </span>
                </td>   
                <td className="col-score">
                  <span className="score-value">{entry.score}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default LeaderboardTable;