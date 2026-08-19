// Importaciones de React y estilos.
import React, { useState } from 'react';
import styles from './StudentSearchBar.module.css'; // Estilos CSS específicos para este componente.

/**
 * Componente StudentSearchBar: Proporciona una barra de búsqueda para filtrar estudiantes.
 * Permite la búsqueda instantánea (al escribir) y explícita (al presionar Enter/botón).
 * @param {object} props - Propiedades del componente.
 * @param {function(string): void} props.onSearch - Función callback que se ejecuta con el término de búsqueda.
 * @param {boolean} [props.isLoading=false] - Indica si una búsqueda está en progreso.
 * @param {boolean} [props.compact=false] - Estilo compacto para la barra de búsqueda.
 */
function StudentSearchBar({ onSearch, isLoading = false, compact = false }) {
  // --- Bloque de Declaración de Estados ---
  // Guarda el valor actual del input de búsqueda.
  const [query, setQuery] = useState('');

  // --- Manejadores de Eventos ---
  /**
   * Maneja el cambio en el input de búsqueda.
   * Actualiza el estado `query` y activa la función `onSearch` con el nuevo valor (búsqueda instantánea).
   * @param {Event} e - El evento de cambio del input.
   */
  const handleChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    onSearch(newQuery); // Llama a la prop `onSearch` con el nuevo término en cada cambio.
  };

  /**
   * Maneja el envío del formulario de búsqueda (ej. al presionar el botón o Enter).
   * @param {Event} e - El evento de envío del formulario.
   */
  const handleSubmit = (e) => {
    e.preventDefault(); // Previene la recarga de la página.
    if (query.trim()) { // Solo busca si el término no está vacío.
      onSearch(query.trim());
    }
  };

  /**
   * Maneja la pulsación de teclas en el input.
   * Si se presiona 'Enter', simula el envío del formulario.
   * @param {Event} e - El evento de pulsación de tecla.
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // --- Renderizado del Componente ---
  return (
    // El formulario contiene el input y el botón de búsqueda.
    <form 
      className={`${styles.studentSearchBar} ${compact ? styles.compact : ''}`} // Aplica estilos condicionales.
      onSubmit={handleSubmit} // Asocia el manejador de envío.
    >
      <input
        type="text"
        placeholder="Buscar por DNI, nombre o apellido..."
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={styles.searchInput}
        disabled={isLoading} // Deshabilita el input si está cargando.
        autoComplete="off"
        aria-label="Buscar estudiante"
      />
      
    </form>
  );
}

export default StudentSearchBar;