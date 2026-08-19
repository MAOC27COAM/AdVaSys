// backend/controllers/gradeController.js

const simulationService = require('../services/simulationService');

const getStudentSimulationResults = async (req, res, next) => {
  try {
    const userId = req.user.id; // El ID del estudiante se obtiene del token JWT
    const roleName = req.user?.role?.name || req.user?.role;

    if (roleName !== 'student') {
      return res.status(403).json({ error: 'Solo los estudiantes pueden consultar sus resultados.' });
    }

    const results = await simulationService.getStudentSimulationResults(userId);
    res.status(200).json(results);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentSimulationResults,
};
