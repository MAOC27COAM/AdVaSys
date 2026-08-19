// backend/src/routes/attendance.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const attendanceController = require('../../controllers/attendanceController');

router.use(authMiddleware);

// Middleware para verificar rol (Matriculador o Admin)
const checkMatriculadorRole = attendanceController.checkMatriculadorRole;

// NUEVA RUTA: Obtener todas las sesiones (Dashboard)
router.get('/sessions', checkMatriculadorRole, attendanceController.getAllSessions);
router.get('/my-history', attendanceController.getMyAttendanceHistory);
router.get('/student/:studentId/history', checkMatriculadorRole, attendanceController.getStudentAttendanceHistory);

// --- Rutas de Gestión de Sesiones (Listas) ---
// 1. Iniciar un nuevo proceso de asistencia (Crea la AttendanceSession)
router.post('/session/start', checkMatriculadorRole, attendanceController.startAttendanceProcess);
// 2. Finalizar el proceso actual (Cierra la sesión con endTime)
router.patch('/session/end/:id', checkMatriculadorRole, attendanceController.endAttendanceProcess);
// 2.1 Reaperturar una sesión ya finalizada (limpia el endTime)
router.patch('/session/reopen/:sessionId', checkMatriculadorRole, attendanceController.reopenAttendanceSession);
router.delete('/session/:sessionId', checkMatriculadorRole, attendanceController.deleteAttendanceSession);


// --- Rutas de Marcación Individual ---
// 3. Obtener lista de estudiantes (para la tabla de pendientes)
router.get('/student-list', checkMatriculadorRole, attendanceController.getStudentListForAttendance);
// 4. Registrar asistencia de un alumno (ahora vinculado a un sessionId)
router.post('/record', checkMatriculadorRole, attendanceController.recordAttendance);


//linea para obtenenr detalles de una sesión pasada (History)
//router.get('/session/:id/details', checkMatriculadorRole, attendanceController.getSessionDetails);
router.get('/session/:sessionId/details', checkMatriculadorRole, attendanceController.getSessionDetails);
router.get('/student/:studentId/export', checkMatriculadorRole, attendanceController.exportStudentAttendanceHistory);
router.get('/puzzle', checkMatriculadorRole, attendanceController.getPuzzleData);
router.get('/puzzle/export', checkMatriculadorRole, attendanceController.exportPuzzleToExcel);
module.exports = router;
