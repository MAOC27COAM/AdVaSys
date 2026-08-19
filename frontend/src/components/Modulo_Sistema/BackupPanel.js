import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { backupService } from '../../services/backupService';
import { Download, Upload, Database, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import styles from './BackupPanel.module.css';

function BackupPanel() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [loadingExport, setLoadingExport] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const isAdmin = user?.role?.name === 'admin' || user?.role?.name === 'kami';

  if (!isAdmin) {
    return (
      <div className={styles.backupPanel}>
        <div className={styles.noAccess}>
          <AlertTriangle size={48} />
          <p>No tienes permisos para acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  const handleExport = async () => {
    setLoadingExport(true);
    setError('');
    try {
      const blob = await backupService.exportDatabase();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.setAttribute('download', `backup_${timestamp}.sql`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al exportar la base de datos.');
    } finally {
      setLoadingExport(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Selecciona un archivo .sql para importar.');
      return;
    }

    const confirmMsg = skipDuplicates
      ? 'Se importarán SOLO los registros nuevos.\nLos existentes serán omitidos automáticamente.\n\n¿Continuar?'
      : 'ADVERTENCIA: Se importarán TODOS los registros.\nLos datos existentes podrían duplicarse.\n\n¿Estás seguro?';

    if (!window.confirm(confirmMsg)) return;

    setLoadingImport(true);
    setError('');
    setResult(null);

    try {
      const resumen = await backupService.importDatabase(file, skipDuplicates);
      setResult(resumen);
      setFile(null);
      document.querySelector('input[type="file"]').value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Error al importar la base de datos.');
    } finally {
      setLoadingImport(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && !selected.name.toLowerCase().endsWith('.sql')) {
      setError('El archivo debe tener extensión .sql');
      setFile(null);
      e.target.value = '';
      return;
    }
    setError('');
    setFile(selected);
    setResult(null);
  };

  return (
    <div className={styles.backupPanel}>
      <h1 className={styles.title}>
        <Database size={28} />
        Backup de Base de Datos
      </h1>

      {error && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <Download size={22} />
          <h2>Exportar</h2>
        </div>
        <p className={styles.cardDesc}>
          Descarga un archivo <code>.sql</code> con todos los datos actuales del sistema.
        </p>
        <button
          className={styles.btnExport}
          onClick={handleExport}
          disabled={loadingExport}
        >
          {loadingExport ? 'Exportando...' : 'Exportar Backup SQL'}
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <Upload size={22} />
          <h2>Importar</h2>
        </div>
        <p className={styles.cardDesc}>
          Sube un archivo <code>.sql</code> para restaurarlo en la base de datos.
        </p>

        <div className={styles.fileInputWrapper}>
          <FileText size={20} />
          <input
            type="file"
            accept=".sql"
            onChange={handleFileChange}
            className={styles.fileInput}
          />
          {file && <span className={styles.fileName}>{file.name}</span>}
        </div>

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={skipDuplicates}
            onChange={(e) => setSkipDuplicates(e.target.checked)}
          />
          <span>Omitir registros duplicados <span className={styles.recommended}>(recomendado)</span></span>
        </label>

        <button
          className={styles.btnImport}
          onClick={handleImport}
          disabled={loadingImport || !file}
        >
          {loadingImport ? 'Importando...' : 'Importar'}
        </button>
      </div>

      {result && (
        <div className={`${styles.resultCard} ${result.success ? styles.resultSuccess : styles.resultError}`}>
          <div className={styles.cardHeader}>
            {result.success ? <CheckCircle size={22} /> : <AlertTriangle size={22} />}
            <h2>
              {result.success
                ? 'Importación completada'
                : 'Error en la importación'}
            </h2>
          </div>

          {result.success ? (
            <div className={styles.resultTable}>
              <div className={styles.resultRowHeader}>
                <span className={styles.resultCol}>Detalle</span>
                <span className={styles.resultColNum}>Cantidad</span>
              </div>
              <div className={styles.resultRow}>
                <span className={styles.resultCol}>Total de sentencias</span>
                <span className={styles.resultColNum}>{result.total_sentencias}</span>
              </div>
              <div className={styles.resultRow}>
                <span className={styles.resultCol}>Registros añadidos</span>
                <span className={styles.resultColNum}>{result.añadidos}</span>
              </div>
              <div className={styles.resultRow}>
                <span className={styles.resultCol}>Registros omitidos (ya existían)</span>
                <span className={styles.resultColNum}>{result.omitidos}</span>
              </div>
              <div className={styles.resultRow}>
                <span className={styles.resultCol}>Errores</span>
                <span className={styles.resultColNum}>{result.errores}</span>
              </div>
            </div>
          ) : (
            <p className={styles.errorDetail}>{result.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default BackupPanel;
