// backend/controllers/scheduleController.js

const scheduleService = require('../services/scheduleService');
const { generateSchedulePdf } = require('../utils/pdfGenerator');

const createSchedule = async (req, res, next) => {
  try {
    const scheduleData = req.body;
    // TODO: Agregar validación de input para scheduleData
    const newSchedule = await scheduleService.createSchedule(scheduleData);
    res.status(201).json({ message: "Horario creado exitosamente", schedule: newSchedule });
  } catch (error) {
    if (error.code === 'P2002') { // Error de constraint único de Prisma
        return res.status(409).json({ error: 'Ya existe un horario para esa modalidad y grupo.' });
    }
    next(error);
  }
};

const getSchedules = async (req, res, next) => {
  try {
    const user = req.user; // El objeto user completo del token JWT
    const schedules = await scheduleService.getSchedulesForUser(user);
    res.status(200).json(schedules);
  } catch (error) {
    next(error);
  }
};

const getScheduleById = async (req, res, next) => {
  try {
    const { scheduleId } = req.params;
    const user = req.user;

    const schedule = await scheduleService.getScheduleByIdForUser(scheduleId, user);
    res.status(200).json(schedule);
  } catch (error) {
    if (error.message === 'Horario no encontrado.' || error.message === 'Acceso denegado.') {
        return res.status(404).json({ error: error.message });
    }
    next(error);
  }
};

const exportScheduleToPdf = async (req, res, next) => {
  try {
    const { scheduleId } = req.params;
    const user = req.user;

    // 1. Obtener los datos del horario (con autorización)
    const schedule = await scheduleService.getScheduleByIdForUser(scheduleId, user);
    
    // 2. Configurar los headers de la respuesta para la descarga del PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=horario-${schedule.name}.pdf`);

    // 3. Generar y streamear el PDF directamente a la respuesta
    generateSchedulePdf(
      schedule,
      () => console.log('PDF de horario generado y enviado.'),
      res
    );

  } catch (error) {
    if (error.message === 'Horario no encontrado.' || error.message === 'Acceso denegado.') {
        return res.status(404).json({ error: error.message });
    }
    next(error);
  }
};

// Middleware para verificar rol (Matriculador o Admin)
const checkMatriculadorRole = (req, res, next) => {
    const userRoleName = req.user.role.name; // CORREGIDO
    if (userRoleName !== 'matriculador' && userRoleName !== 'admin' && userRoleName !== 'kami') {
        return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente.' });
    }
    next();
};

module.exports = {
  createSchedule,
  getSchedules,
  getScheduleById,
  exportScheduleToPdf,
  checkMatriculadorRole,
};
