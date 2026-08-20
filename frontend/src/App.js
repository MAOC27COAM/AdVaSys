import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Interfaz/Dashboard';
import EnrollmentModule from './components/Modulo_Matricula/EnrollmentModule'; // Importación añadida
import CourseModule from './components/Modulo_Material/CourseModule';
import SimulationModule from './components/Modulo_Simulacro/SimulationModule'; // NUEVO: Importar SimulationModule
import AttendanceModule from './components/Modulo_Asistencia/AttendanceModule'; // NUEVO: Importar AttendanceModule
import StudentAttendanceHistory from './components/Modulo_Asistencia/StudentAttendanceHistory';
import ScheduleModule from './components/Modulo_Horarios/ScheduleModule'; // NUEVO: Importar ScheduleModule
import MyGradesSimple from './components/Modulo_resultados/MyGradesSimple';
import UserManager from './components/Modulo_Gestion/UserManager'; 
import AdminUserManager from './components/Modulo_Gestion/AdminUserManager'; 
import PaymentsModule from './components/Modulo_Pagos/PaymentsModule';
import PaymentDashboard from './components/Modulo_Pagos/PaymentDashboard';
import PaymentStudentDetail from './components/Modulo_Pagos/PaymentStudentDetail';
//nuevo cruta para el modulo de perfil
import PerfilModule from './components/Modulo_Perfil/ModulePerfil'; // Ajusta la ruta de la carpeta
import BackupPanel from './components/Modulo_Sistema/BackupPanel';


function App() {
  return (    
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />      
        {/* El componente Dashboard ahora maneja su propia protección */}
        <Route path="/dashboard" element={<Dashboard />}>
          {/* Ruta por defecto del dashboard: redirige a matrícula  
          <Route index element={<Navigate to="matricula" replace />} />*/}
          {/* Ruta para el módulo de matrícula */}
          <Route path="matricula" element={<EnrollmentModule />} />
          {/* Ruta para el nuevo módulo de cursos */}
          <Route path="cursos/:courseId?" element={<CourseModule />} />
          {/* Ruta para el módulo de simulacros */}
          <Route path="simulacros/*" element={<SimulationModule />} />
          {/* Ruta para el módulo de asistencia */}
          <Route path="asistencia" element={<AttendanceModule />} />
          <Route path="mis-asistencias" element={<StudentAttendanceHistory title="Mi historial de asistencia" />} />
          {/* Ruta para el módulo de horarios */}
          <Route path="horarios/*" element={<ScheduleModule />} />
          {/* Ruta para el módulo de calificaciones del estudiante */}
          <Route path="mis-resultados" element={<MyGradesSimple />} />
          {/* este el la ruta para la gestion de todos los usuarios del sistema */}
          <Route path="usuarios" element={<UserManager />} />
          {/* ruta para la gestion de usuarios administrativos (admin, profesor, matriculador) */}
          <Route path="usuarios/administrativos" element={<AdminUserManager />} />
          <Route path="pagos" element={<PaymentsModule />}>
            <Route index element={<PaymentDashboard />} />
            <Route path="alumno/:documentId" element={<PaymentStudentDetail />} />
          </Route>
          {/* esta es la ruta para el el perfil del ususario */}
          <Route path="perfil" element={<PerfilModule />} />
          <Route path="backup" element={<BackupPanel />} />
          
        </Route>

        {/* Redirigir a /login si la ruta no coincide con ninguna de las anteriores */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App; // Exportación por defecto añadida
