// import React, { useState } from 'react';
// import axios from 'axios';
// import './UploadPanel.css';
// const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000/api";
// function UploadPanel({ modality }) {
//   const [file, setFile] = useState(null);
//   const [examName, setExamName] = useState('');
//   const [message, setMessage] = useState({ type: '', content: '' });
//   const [isLoading, setIsLoading] = useState(false);
//   const [dragActive, setDragActive] = useState(false);

//   const handleFileChange = (e) => {
//     const selectedFile = e.target.files[0];
//     if (selectedFile) {
//       setFile(selectedFile);
//       setMessage({ type: '', content: '' });
//     }
//   };

//   const handleDrag = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     if (e.type === "dragenter" || e.type === "dragover") {
//       setDragActive(true);
//     } else if (e.type === "dragleave") {
//       setDragActive(false);
//     }
//   };

//   const handleDrop = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     setDragActive(false);
    
//     if (e.dataTransfer.files && e.dataTransfer.files[0]) {
//       const droppedFile = e.dataTransfer.files[0];
//       if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
//         setFile(droppedFile);
//         setMessage({ type: '', content: '' });
//       } else {
//         setMessage({ type: 'error', content: 'Por favor, selecciona un archivo Excel válido (.xlsx o .xls)' });
//       }
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
    
//     if (!file || !examName) {
//       setMessage({ type: 'error', content: 'Por favor, selecciona un archivo y escribe un nombre para el simulacro.' });
//       return;
//     }

//     const formData = new FormData();
//     formData.append('leaderboardFile', file);
//     formData.append('modality', modality);
//     formData.append('examName', examName);

//     const token = localStorage.getItem('token');
//     setMessage({ type: '', content: '' });
//     setIsLoading(true);

//     try {
//       const response = await axios.post(`${API_URL}/leaderboard/upload`, formData, {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//           Authorization: `Bearer ${token}`,
//         },
//       });
//       setMessage({ type: 'success', content: response.data.message });
//       // Limpiar el formulario
//       setFile(null);
//       setExamName('');
//       // Reset file input
//       const fileInput = document.getElementById(`file-${modality}`);
//       if (fileInput) fileInput.value = '';
//     } catch (err) {
//       setMessage({ type: 'error', content: err.response?.data?.error || 'Ocurrió un error al subir el archivo.' });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const removeFile = () => {
//     setFile(null);
//     const fileInput = document.getElementById(`file-${modality}`);
//     if (fileInput) fileInput.value = '';
//   };

//   return (
//     <div className="upload-panel">
//       <div className="upload-header">
//         <h3 className="upload-title">
//           <span className="modality-badge">{modality}</span>
//         </h3>
//       </div>

//       <form onSubmit={handleSubmit} className="upload-form">
//         {message.content && (
//           <div className={`upload-message ${message.type}`}>
//             <span className="message-icon">
//               {message.type === 'success' ? '✓' : '⚠'}
//             </span>
//             <span className="message-text">{message.content}</span>
//           </div>
//         )}

//         <div className="form-group">
//           <label className="form-label" htmlFor={`examName-${modality}`}>
//             Nombre del Simulacro
//           </label>
//           <input
//             type="text"
//             id={`examName-${modality}`}
//             name = "leaderboardFile"
//             value={examName}
//             onChange={(e) => setExamName(e.target.value)}
//             className="form-input"
//             placeholder="Ej: Simulacro General - Semana 5"
//             //required  //No seria necesario al parecer
//           />
//         </div>

//         <div className="form-group">
//           <label className="form-label">
//             Archivo Excel
//           </label>
          
//           <div 
//             className={`file-drop-zone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
//             onDragEnter={handleDrag}
//             onDragLeave={handleDrag}
//             onDragOver={handleDrag}
//             onDrop={handleDrop}
//           >
//             <input
//               type="file"
//               id={`file-${modality}`}
//               onChange={handleFileChange}
//               className="file-input"
//               accept=".xlsx, .xls"
//               required
//             />
            
//             {!file ? (
//               <label htmlFor={`file-${modality}`} className="file-label">
//                 <div className="upload-icon">📁</div>
//                 <div className="upload-text">
//                   <span className="upload-text-main">Arrastra tu archivo aquí</span>
//                   <span className="upload-text-sub">o haz clic para seleccionar</span>
//                 </div>
//                 <div className="upload-format">Formatos: .xlsx, .xls</div>
//               </label>
//             ) : (
//               <div className="file-preview">
//                 <div className="file-info">
//                   <span className="file-icon">📄</span>
//                   <div className="file-details">
//                     <span className="file-name">{file.name}</span>
//                     <span className="file-size">
//                       {(file.size / 1024).toFixed(2)} KB
//                     </span>
//                   </div>
//                 </div>
//                 <button 
//                   type="button" 
//                   onClick={removeFile}
//                   className="file-remove"
//                   aria-label="Eliminar archivo"
//                 >
//                   ✕
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>

//         <button 
//           type="submit" 
//           className={`submit-button ${isLoading ? 'loading' : ''}`}
//           disabled={isLoading}
//         >
//           {isLoading ? (
//             <>
//               <span className="loading-spinner"></span>
//               Subiendo...
//             </>
//           ) : (
//             <>
//               <span className="button-icon">⬆</span>
//               Subir Tabla de Posiciones
//             </>
//           )}
//         </button>
//       </form>
//     </div>
//   );
// }

// export default UploadPanel;