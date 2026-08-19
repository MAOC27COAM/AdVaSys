// FileIcon.js
import React from 'react';
// Asumimos que usas alguna librería de iconos como 'react-icons'
// Si no, puedes usar texto o imágenes.
import { FaFilePdf, FaFileWord, FaFilePowerpoint, FaFileAlt, FaFileImage } from 'react-icons/fa'; 

const getIconByMimeType = (mimeType) => {
  if (!mimeType) return <FaFileAlt style={{ color: '#aaa' }} />; // Icono genérico gris

  if (mimeType.includes('pdf')) {
    return <FaFilePdf style={{ color: '#e74c3c' }} />; // Rojo PDF
  }
  if (mimeType.includes('word') || mimeType.includes('officedocument.wordprocessingml')) {
    return <FaFileWord style={{ color: '#3498db' }} />; // Azul Word
  }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint') || mimeType.includes('officedocument.presentationml')) {
    return <FaFilePowerpoint style={{ color: '#e67e22' }} />; // Naranja PPT
  }
  if (mimeType.includes('image')) {
    return <FaFileImage style={{ color: '#2ecc71' }} />; // Verde Imagen
  }

  return <FaFileAlt style={{ color: '#34495e' }} />; // Genérico oscuro
};

// Componente simple para renderizar el icono con estilos uniformes
const FileIcon = ({ mimeType }) => {
  return (
    <div className="file-icon-container" style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {getIconByMimeType(mimeType)}
    </div>
  );
};

export default FileIcon;