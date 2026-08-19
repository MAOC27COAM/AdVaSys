import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import styles from './PaymentSearchAutocomplete.module.css';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 300;

function PaymentSearchAutocomplete({ cycleId }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!cycleId || query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setError('');
      setLoading(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const data = await paymentService.searchStudents(cycleId, query.trim());
        setResults(data);
        setIsOpen(true);
      } catch (err) {
        setResults([]);
        setError(err.response?.data?.error || 'No se pudo buscar estudiantes.');
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [cycleId, query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
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
    navigate(`/dashboard/pagos/alumno/${student.documentId}`);
  };

  const formatPending = (amount) => {
    if (amount === null || amount === undefined) {
      return 'Sin acuerdo';
    }
    return `S/ ${Number(amount).toFixed(2)}`;
  };

  return (
    <div className={styles.autocompleteWrapper} ref={containerRef}>
      <input
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (results.length > 0) {
            setIsOpen(true);
          }
        }}
        placeholder="Buscar por DNI, nombre o apellido (mín. 3 caracteres)"
        className={styles.autocompleteInput}
        autoComplete="off"
        aria-label="Buscar estudiante para pagos"
      />

      {loading && <p className={styles.autocompleteHint}>Buscando...</p>}
      {!loading && query.trim().length > 0 && query.trim().length < MIN_QUERY_LENGTH && (
        <p className={styles.autocompleteHint}>Escribe al menos 3 caracteres.</p>
      )}
      {error && <p className={styles.error}>{error}</p>}

      {isOpen && results.length > 0 && (
        <ul className={styles.autocompleteList}>
          {results.map((student) => (
            <li key={student.userId}>
              <button
                type="button"
                className={styles.autocompleteItem}
                onClick={() => handleSelect(student)}
              >
                <span className={styles.autocompleteName}>{student.fullName}</span>
                <span className={styles.autocompleteMeta}>
                  DNI {student.documentId} · {student.status} · {formatPending(student.currentPendingAmount)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen && !loading && query.trim().length >= MIN_QUERY_LENGTH && results.length === 0 && !error && (
        <p className={styles.autocompleteHint}>No se encontraron resultados.</p>
      )}
    </div>
  );
}

export default PaymentSearchAutocomplete;
