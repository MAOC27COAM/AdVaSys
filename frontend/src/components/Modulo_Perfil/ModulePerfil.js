import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PerfilService } from '../../services/PerfilService';
import { QRCodeSVG } from 'qrcode.react';
import { X, Maximize2, Loader2, UserCircle, Award, MapPin, Phone, Mail, Fingerprint } from 'lucide-react';
import styles from './ModulePerfil.module.css';
import StudentAttendanceHistory from '../Modulo_Asistencia/StudentAttendanceHistory';

const TURNO_LABELS = {
  TURNO_MANANA: 'Turno mañana',
  TURNO_TARDE: 'Turno tarde',
  TURNO_COMPLETO: 'Turno completo',
};

function PerfilModule() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isQrMaximized, setIsQrMaximized] = useState(false);

  const fetchProfileInfo = useCallback(async () => {
    if (!user || !user.id) return;

    setLoading(true);
    setError(null);
    try {
      const response = await PerfilService.getStudentById(user.id);
      
      // MAPEO: Ajustamos los datos de la DB al estado del componente
      const mappedData = {
        nombres: response.firstName,
        apellidos: response.lastName,
        dni: response.documentId, // Importante para el QR
        email: response.email,
        telefono: response.phone,
        fotoUrl: response.profilePictureUrl,
        modalidad: response.studentProfile?.modality,
        turno: response.studentProfile?.schedule,
        edad: response.studentProfile?.age,
        ciclo: response.cycleEnrollments?.[0]?.cycle?.name || 'Sin ciclo asignado',
        direccion: response.address
      };
      
      setProfileData(mappedData);
    } catch (err) {
      console.error("Error al cargar perfil:", err);
      setError(err.response?.data?.error || 'No se pudo cargar la información del perfil.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfileInfo();
  }, [fetchProfileInfo]);

  const toggleQrMaximize = () => setIsQrMaximized(!isQrMaximized);

  if (loading) {
    return (
      <div className={styles.loaderContainer}>
        <div className={styles.spinner}></div>
        <p>Sincronizando datos académicos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.inlineError}>{error}</p>
        <button onClick={fetchProfileInfo} className={styles.uploadBtn}>Reintentar</button>
      </div>
    );
  }

  if (!profileData) return null;

  return (
    <div className={styles.profileContainer}>
      <div className={styles.scrollableContent}>
        
        {/* HERO SECTION */}
        <section className={styles.profileHero}>
          <div className={styles.heroOverlay}>
            <div className={styles.avatarWrapper}>
              {profileData.fotoUrl ? (
                <img src={profileData.fotoUrl} alt="Perfil" className={styles.avatarImg} />
              ) : (
                <UserCircle size={120} color="#9ca3af" strokeWidth={1} />
              )}
            </div>
            <div className={styles.heroText}>
              {/* <span className={styles.studentBadge}>{profileData.ciclo}</span> */}
              <h2>{profileData.nombres} {profileData.apellidos}</h2>
              <p className={styles.heroDescription}>Estudiante de la Academia Vallejo</p>
            </div>
          </div>
        </section>

        {/* INFO SECTION */}
        <div className={styles.infoSection}>
          
          {/* Datos Personales */}
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <label><Fingerprint size={12} style={{marginRight: 5}}/> DNI / Documento</label>
              <p>{profileData.dni}</p>
            </div>
            <div className={styles.infoCard}>
              <label><Mail size={12} style={{marginRight: 5}}/> Correo Institucional</label>
              <p>{profileData.email || 'No asignado'}</p>
            </div>
            <div className={styles.infoCard}>
              <label><Phone size={12} style={{marginRight: 5}}/> Teléfono</label>
              <p>{profileData.telefono || 'No registrado'}</p>
            </div>
            <div className={styles.infoCard}>
              <label>Modalidad</label>
              <p>{profileData.modalidad?.replace('_', ' ') || 'No definida'}</p>
            </div>
            <div className={styles.infoCard}>
              <label>Turno</label>
              <p>{TURNO_LABELS[profileData.turno] || profileData.turno || 'No definido'}</p>
            </div>
            <div className={styles.infoCard}>
              <label>Edad</label>
              <p>{profileData.edad ? `${profileData.edad} años` : '--'}</p>
            </div>
            <div className={`${styles.infoCard} ${styles.fullWidth}`}>
              <label><MapPin size={12} style={{marginRight: 5}}/> Dirección</label>
              <p>{profileData.direccion || 'Dirección no especificada'}</p>
            </div>
          </div>

          {/* QR Card */}
          <div className={styles.qrCard}>
            <h4>Firma Digital (Asistencia)</h4>
            <div className={styles.qrWrapper} onClick={toggleQrMaximize}>
              <QRCodeSVG 
                value={profileData.dni || "00000000"} 
                size={140} 
                level="H" 
                includeMargin={false}
              />
              <div className={styles.qrOverlay}>
                <Maximize2 size={24} color="#fff" />
              </div>
            </div>
            <p>Toca el código para expandir al marcar tu entrada</p>
          </div>
        </div>

        {/* <div className={styles.attendanceSection}>
          <StudentAttendanceHistory
            title="Mi historial de asistencia"
            embedded
          />
        </div> */}
      </div>

      {/* MODAL QR MAXIMIZADO */}
      {isQrMaximized && (
        <div className={styles.maximizedOverlay} onClick={toggleQrMaximize}>
          <div className={styles.maximizedContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeMaxBtn} onClick={toggleQrMaximize}>
              <X size={40} />
            </button>
            <h3 style={{color: '#0f172a', marginBottom: 20}}>Control de Asistencia</h3>
            <div className={styles.giantQr}>
              <QRCodeSVG 
                value={profileData.dni || "00000000"} 
                size={window.innerWidth < 500 ? 280 : 400} 
                level="H"
                includeMargin={true}
              />
            </div>
            <div style={{marginTop: 20, color: '#1e293b', fontWeight: 'bold', fontSize: '1.2rem'}}>
              DNI: {profileData.dni}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PerfilModule;
