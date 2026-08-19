import React, { useEffect, useState } from 'react';
import { attendanceService } from '../../services/attendanceService';
import style from './AttendanceModule.module.css';

function AttendanceDashboard({ activeCycleId, onActionStart, onActionViewHistory, onActionViewStudentHistory, onActionPuzzle }) {
    const [activeSessions, setActiveSessions] = useState([]);
    const [pastSessions, setPastSessions] = useState({});
    const [loading, setLoading] = useState(true);
    const [newSessionName, setNewSessionName] = useState('');

    useEffect(() => {
        if (!activeCycleId) {
            setActiveSessions([]);
            setPastSessions({});
            setLoading(false);
            return;
        }

        loadSessions();
    }, [activeCycleId]);

    const formatLongDate = (value) =>
        new Date(value).toLocaleDateString('es-PE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });

    const loadSessions = async () => {
        try {
            setLoading(true);
            const data = await attendanceService.getAllSessions(activeCycleId);
            const active = data.filter((session) => !session.endTime);
            const past = data.filter((session) => session.endTime);

            const grouped = past.reduce((acc, session) => {
                const sessionDate = new Date(session.startTime || session.StartTime);
                const dateKey = sessionDate.toISOString().slice(0, 10);
                if (!acc[dateKey]) {
                    acc[dateKey] = {
                        label: formatLongDate(sessionDate),
                        sessions: [],
                    };
                }
                acc[dateKey].sessions.push(session);
                return acc;
            }, {});

            setActiveSessions(active);
            setPastSessions(grouped);
        } catch (err) {
            console.error('Error al cargar sesiones:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSession = async () => {
        if (!newSessionName.trim()) return alert('Ponle un nombre a la sesion');
        try {
            const newSession = await attendanceService.startSession(newSessionName, activeCycleId);
            onActionStart(newSession);
        } catch (err) {
            alert(err.response?.data?.error || 'Error al crear sesion');
        }
    };

    const handleDeleteSession = async (sessionId, sessionName) => {
        const confirmed = window.confirm(
            `Eliminar la sesion en curso "${sessionName || 'Sin nombre'}"? Esta accion borrara sus registros de asistencia.`
        );

        if (!confirmed) return;

        try {
            await attendanceService.deleteSession(sessionId, activeCycleId);
            await loadSessions();
        } catch (err) {
            console.error('Error al eliminar sesion:', err);
            alert(err.response?.data?.error || 'No se pudo eliminar la sesion.');
        }
    };

    if (loading) return <div className={style.mainContent}>Cargando panel...</div>;

    return (
        <div className={style.contentWrapper}>
            <div className={style.leftPanel}>
                <div className={style.glassSection}>
                    <div className={style.sectionHeader}>
                        <h4>Nuevo Pase de Lista</h4>
                    </div>
                    <input
                        type="text"
                        placeholder="Ej: Turno Manana - Aula A"
                        value={newSessionName}
                        onChange={(e) => setNewSessionName(e.target.value)}
                        className={style.secondaryBtn}
                        style={{ width: '100%', marginBottom: '10px', background: 'rgba(0,0,0,0.2)', textAlign: 'left' }}
                    />
                    <button className={style.primaryBtn} onClick={handleCreateSession} style={{ width: '100%' }}>
                        INICIAR nuevo pase
                    </button>
                </div>

                <div className={style.glassSection} style={{ flex: 1, marginTop: '20px' }}>
                    <div className={style.sectionHeader}>
                        <h4>Sesiones en curso</h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {activeSessions.length > 0 ? activeSessions.map((session) => (
                            <div key={session.id} className={style.glassSection} style={{ padding: '12px', border: '1px solid #f97316' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 'bold' }}>{session.name}</span>
                                    <span style={{ color: '#f97316', fontSize: '0.75rem' }}>
                                        {new Date(session.startTime || session.StartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <button
                                    className={style.secondaryBtn}
                                    style={{ marginTop: '10px', width: '100%', fontSize: '0.75rem', borderColor: '#f97316' }}
                                    onClick={() => onActionStart(session)}
                                >
                                    Continuar marcacion
                                </button>
                                <button
                                    className={style.deleteBtn}
                                    style={{ marginTop: '10px', width: '100%', fontSize: '0.75rem' }}
                                    onClick={() => handleDeleteSession(session.id, session.name)}
                                >
                                    Eliminar sesion
                                </button>
                            </div>
                        )) : <p style={{ opacity: 0.5, fontSize: '0.8rem', textAlign: 'center' }}>No hay sesiones pendientes.</p>}
                    </div>
                </div>
            </div>

            <div className={style.mainContent} style={{ flex: 1.5 }}>
                <div className={style.sectionHeader}>
                    <h4>Historial de Sesiones</h4>
                    <button className={style.secondaryBtn} onClick={onActionPuzzle} style={{ fontSize: '0.75rem' }}>
                        Rompecabeza
                    </button>
                </div>

                <div style={{ overflowY: 'auto', maxHeight: '75vh', paddingRight: '10px' }}>
                    {Object.keys(pastSessions).length > 0
                        ? Object.keys(pastSessions)
                            .sort((a, b) => new Date(b) - new Date(a))
                            .map((dateKey) => (
                                <div key={dateKey} style={{ marginBottom: '25px' }}>
                                    <div
                                        style={{
                                            color: '#f97316',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold',
                                            marginBottom: '10px',
                                            borderBottom: '1px solid rgba(249, 115, 22, 0.3)',
                                            display: 'inline-block',
                                        }}
                                    >
                                        {pastSessions[dateKey].label}
                                    </div>
                                    {pastSessions[dateKey].sessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className={style.glassSection}
                                            style={{
                                                margin: '10px 0',
                                                cursor: 'pointer',
                                                padding: '15px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                            }}
                                            onClick={() => onActionViewHistory(session)}
                                        >
                                            <span>{session.name}</span>
                                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Ver reporte -&gt;</span>
                                        </div>
                                    ))}
                                </div>
                            ))
                        : <p style={{ opacity: 0.5 }}>No hay historial registrado.</p>}
                </div>
            </div>
        </div>
    );
}

export default AttendanceDashboard;
