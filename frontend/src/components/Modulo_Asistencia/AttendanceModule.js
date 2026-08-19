import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import AttendanceDashboard from './AttendanceDashboard';
import AttendanceScanner from './AttendanceScanner';
import AttendanceHistory from './AttendanceHistory';
import StudentAttendanceHistory from './StudentAttendanceHistory';
import AttendancePuzzle from './Puzzle/AttendancePuzzle';
import style from './AttendanceModule.module.css';

function AttendanceModule() {
    const { userRole, activeCycleId } = useOutletContext();
    const [view, setView] = useState('DASHBOARD');
    const [selectedSession, setSelectedSession] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [prevView, setPrevView] = useState('DASHBOARD');

    const isAuthorized = userRole === 'admin' || userRole === 'matriculador' || userRole === 'kami';

    useEffect(() => {
        setSelectedSession(null);
        setSelectedStudent(null);
        setView('DASHBOARD');
    }, [activeCycleId]);

    if (!isAuthorized) {
        return (
            <div className={style.errorAccess}>
                <h3>Acceso denegado</h3>
                <p>Tu rol (<b>{userRole || 'Invitado'}</b>) no tiene permisos para este modulo.</p>
            </div>
        );
    }

    if (!activeCycleId) {
        return (
            <div className={style.mainWrapper}>
                <h2 className={style.moduleTitle}>Modulo de Asistencia</h2>
                <div className={style.errorAccess}>
                    <h3>Ciclo no seleccionado</h3>
                    <p>Selecciona un ciclo en el modulo de Matricula para trabajar la asistencia.</p>
                </div>
            </div>
        );
    }

    const handleStartAttendance = (session) => {
        setSelectedSession(session);
        setView('SCANNER');
    };

    const handleViewDetails = (session) => {
        setSelectedSession(session);
        setView('HISTORY');
    };

    const handleBackToDashboard = () => {
        setSelectedSession(null);
        setSelectedStudent(null);
        setView('DASHBOARD');
    };

    const handleViewStudentHistory = (student) => {
        setPrevView(view);
        setSelectedStudent(student);
        setSelectedSession(null);
        setView('STUDENT_HISTORY');
    };

    const handleBackFromStudentHistory = () => {
        setSelectedStudent(null);
        setView(prevView);
    };

    const handleOpenPuzzle = () => {
        setSelectedSession(null);
        setSelectedStudent(null);
        setView('PUZZLE');
    };

    return (
        <div className={style.mainWrapper}>
            <h2 className={style.moduleTitle}>Modulo de Asistencia</h2>

            {view === 'DASHBOARD' && (
                <AttendanceDashboard
                    activeCycleId={activeCycleId}
                    onActionStart={handleStartAttendance}
                    onActionViewHistory={handleViewDetails}
                    onActionViewStudentHistory={handleViewStudentHistory}
                    onActionPuzzle={handleOpenPuzzle}
                />
            )}

            {view === 'PUZZLE' && (
                <AttendancePuzzle
                    activeCycleId={activeCycleId}
                    onBack={handleBackToDashboard}
                    onActionViewStudentHistory={handleViewStudentHistory}
                />
            )}

            {view === 'SCANNER' && selectedSession && (
                <AttendanceScanner
                    activeCycleId={activeCycleId}
                    session={selectedSession}
                    onBack={handleBackToDashboard}
                />
            )}

            {view === 'HISTORY' && selectedSession && (
                <AttendanceHistory
                    activeCycleId={activeCycleId}
                    session={selectedSession}
                    onBack={handleBackToDashboard}
                />
            )}

            {view === 'STUDENT_HISTORY' && selectedStudent && (
                <StudentAttendanceHistory
                    studentId={selectedStudent.id}
                    cycleId={activeCycleId}
                    title="Consulta de Asistencia del Alumno"
                    studentInfo={selectedStudent}
                    onBack={handleBackFromStudentHistory}
                />
            )}
        </div>
    );
}

export default AttendanceModule;
