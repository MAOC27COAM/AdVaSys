// backend/src/routes/schedules.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const scheduleController = require('../../controllers/scheduleController');

router.use(authMiddleware);

// Middleware para verificar rol (Matriculador o Admin)
const checkMatriculadorRole = scheduleController.checkMatriculadorRole;

// --- Rutas de Horarios ---
router.post('/', checkMatriculadorRole, scheduleController.createSchedule);
router.get('/', scheduleController.getSchedules);
router.get('/:scheduleId', scheduleController.getScheduleById);
router.get('/:scheduleId/export-pdf', scheduleController.exportScheduleToPdf);

module.exports = router;
