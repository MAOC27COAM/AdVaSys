import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { simulationService } from '../../services/simulationService';
import styles from './StudentSearchBar.module.css';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

function StudentSearchBar({ activeCycleId }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!activeCycleId || query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const data = await simulationService.searchStudents(query.trim(), activeCycleId);
        if (!controller.signal.aborted) {
          setResults(data);
          setIsOpen(true);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setResults([]);
          setError(err.response?.data?.error || 'Error al buscar.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [activeCycleId, query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (student) => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    navigate(`/dashboard/simulacros/estado-academico/${student.id}`);
  };

  if (!activeCycleId) return null;

  return (
    <div className={styles.searchWrapper} ref={containerRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => { if (results.length > 0) setIsOpen(true); }}
        placeholder="Buscar alumno por DNI, nombre o apellido (mín. 3 caracteres)"
        className={styles.searchInput}
        autoComplete="off"
        aria-label="Buscar alumno para ver estado académico"
      />
      {loading && <p className={styles.searchHint}>Buscando...</p>}
      {!loading && query.length > 0 && query.length < MIN_QUERY_LENGTH && (
        <p className={styles.searchHint}>Escribe al menos 3 caracteres.</p>
      )}
      {error && <p className={styles.searchError}>{error}</p>}
      {isOpen && results.length > 0 && (
        <ul className={styles.searchList}>
          {results.map((s) => (
            <li key={s.id}>
              <button type="button" className={styles.searchItem} onClick={() => handleSelect(s)}>
                <span className={styles.searchName}>{s.fullName}</span>
                <span className={styles.searchMeta}>
                  DNI {s.documentId} &middot; {s.modality || 'Sin modalidad'} &middot; {s.group ? `Grupo ${s.group}` : 'Sin grupo'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {isOpen && !loading && query.length >= MIN_QUERY_LENGTH && results.length === 0 && !error && (
        <p className={styles.searchHint}>No se encontraron alumnos.</p>
      )}
    </div>
  );
}

export default StudentSearchBar;
