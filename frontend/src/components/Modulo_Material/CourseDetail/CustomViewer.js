import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import styles from './CustomViewer.module.css';

// Configuración del worker
// NOTA: Empaquetar el worker con webpack/CRA falla (imports internos de
// @babel/runtime/helpers/esm/*), así que lo servimos desde /public.
// El archivo pdf.worker.min.mjs se copia desde node_modules/pdfjs-dist/build/.
pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.mjs`;

const CustomViewer = ({ file, blobUrl, onClose }) => {
  const containerRef = useRef(null);
  const canvasRefs = useRef({});
  const renderTasksRef = useRef({}); 

  const [pdfDoc, setPdfDoc] = useState(null);
  const [pages, setPages] = useState([]);
  const [zoom, setZoom] = useState(1.1); // Un poco más de zoom inicial para lectura
  const [loading, setLoading] = useState(true);

  const isPDF = file?.mimeType?.includes('pdf');
  const isImage = file?.mimeType?.includes('image');

  // Cargar PDF inicial
  useEffect(() => {
    if (!isPDF || !blobUrl) return;

    const loadPDF = async () => {
      try {
        setLoading(true);
        // Usamos slice(0) para evitar que el buffer se desconecte
        const pdf = await pdfjsLib.getDocument({
          data: blobUrl.slice(0),
        }).promise;

        setPdfDoc(pdf);
        setPages(Array.from({ length: pdf.numPages }, (_, i) => i + 1));
      } catch (err) {
        console.error('Error cargando PDF:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPDF();
  }, [blobUrl, isPDF]);

  // Renderizado de páginas con soporte para pantallas Retina/Nítidas
  useEffect(() => {
    if (!pdfDoc) return;

    const renderTasks = renderTasksRef.current;

    const renderPage = async (pageNum) => {
      const canvas = canvasRefs.current[pageNum];
      if (!canvas) return;

      try {
        // Cancelar si ya hay un render en curso para esta página específica
        if (renderTasks[pageNum]) {
          renderTasks[pageNum].cancel();
        }

        const page = await pdfDoc.getPage(pageNum);
        const dpr = window.devicePixelRatio || 1; // Factor de nitidez
        const viewport = page.getViewport({ scale: zoom });

        const context = canvas.getContext('2d');

        // Ajuste de resolución del canvas para que el texto no se vea borroso
        canvas.height = viewport.height * dpr;
        canvas.width = viewport.width * dpr;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.scale(dpr, dpr);
        context.clearRect(0, 0, canvas.width, canvas.height);

        const renderTask = page.render({
          canvasContext: context,
          viewport,
        });

        renderTasks[pageNum] = renderTask;
        await renderTask.promise;
        renderTasks[pageNum] = null;

      } catch (err) {
        if (err.name !== 'RenderingCancelledException') {
          console.error(`Error render pág ${pageNum}:`, err);
        }
      }
    };

    pages.forEach(pageNum => renderPage(pageNum));

    // Cleanup: cancelar todo al desmontar o cambiar zoom
    return () => {
      Object.values(renderTasks).forEach(task => task?.cancel());
    };
  }, [pdfDoc, pages, zoom]);

  return (
    <div className={styles.overlay}>
      <header className={styles.header}>
        <div className={styles.fileInfo}>
          <span className={styles.fileName}>{file.name}</span>
        </div>

        <div className={styles.controls}>
          <div className={styles.zoomGroup}>
            <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))}>−</button>
            <span className={styles.zoomText}>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))}>+</button>
          </div>
          <div className={styles.divider} />
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
      </header>

      <div ref={containerRef} className={styles.viewerScroll}>
        {loading && (
          <div className={styles.loaderContainer}>
            <div className={styles.spinner}></div>
            <p>Preparando material de estudio...</p>
          </div>
        )}

        {isPDF && pages.map(pageNum => (
          <div key={pageNum} className={styles.pageWrapper}>
            <canvas
              ref={(el) => { if (el) canvasRefs.current[pageNum] = el; }}
            />
            <div className={styles.pageNumber}>{pageNum}</div>
          </div>
        ))}

        {isImage && (
          <div className={styles.imageContainer}>
            <img
              src={blobUrl}
              alt={file.name}
              className={styles.image}
              style={{ transform: `scale(${zoom})` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomViewer;