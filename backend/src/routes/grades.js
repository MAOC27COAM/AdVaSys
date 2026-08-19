// backend/src/routes/grades.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const gradeController = require('../../controllers/gradeController');

router.use(authMiddleware);

// --- Rutas de Calificaciones (solo ESTUDIANTE) ---
router.get('/me/simulation-results', gradeController.getStudentSimulationResults);

module.exports = router;
