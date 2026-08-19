const attendanceService = require('../services/attendanceService');

const getStudentListForAttendance = async (req, res, next) => {
  try {
    const { cycleId, sessionType, ...filters } = req.query;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere un ciclo activo.' });
    }

    const studentFilters = { ...filters, roleName: 'student', sessionType };
    const users = await attendanceService.getAllUsers(cycleId, studentFilters);
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

const checkMatriculadorRole = (req, res, next) => {
  const userRoleName = req.user.role.name;
  if (userRoleName !== 'matriculador' && userRoleName !== 'admin' && userRoleName !== 'kami') {
    return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente.' });
  }
  next();
};

const startAttendanceProcess = async (req, res, next) => {
  try {
    const { name, cycleId } = req.body;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere un ciclo activo.' });
    }

    const session = await attendanceService.startSession(name, cycleId);
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
};

const recordAttendance = async (req, res, next) => {
  try {
    const { identifierType, identifierValue, status, sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Se requiere una sesion activa.' });
    }

    const result = await attendanceService.recordAttendance(
      identifierType,
      identifierValue,
      status,
      sessionId
    );
    res.status(201).json(result);
  } catch (error) {
    if (
      error.message === 'Usuario no activo o no encontrado.' ||
      error.message === 'El estudiante no pertenece al ciclo activo de la sesion.' ||
      error.message === 'Sesion no encontrada para el ciclo seleccionado.'
    ) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

const endAttendanceProcess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { missingStudentIds, cycleId } = req.body;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere un ciclo activo.' });
    }

    await attendanceService.getSessionDetails(id, cycleId);

    if (missingStudentIds && missingStudentIds.length > 0) {
      await Promise.all(
        missingStudentIds.map((userId) =>
          attendanceService.recordAttendance('userId', userId, 'ABSENT', id)
        )
      );
    }

    const result = await attendanceService.endSession(id, cycleId);

    res.status(200).json({
      message: 'Proceso de asistencia finalizado exitosamente',
      session: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAllSessions = async (req, res, next) => {
  try {
    const { cycleId } = req.query;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere un ciclo activo.' });
    }

    const sessions = await attendanceService.getAllSessions(cycleId);
    res.status(200).json(sessions);
  } catch (error) {
    next(error);
  }
};

const getSessionDetails = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { cycleId } = req.query;

    if (!sessionId) {
      return res.status(400).json({ error: 'ID de sesion no proporcionado' });
    }

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere un ciclo activo.' });
    }

    const sessionDetails = await attendanceService.getSessionDetails(sessionId, cycleId);
    res.status(200).json(sessionDetails || []);
  } catch (error) {
    if (error.message === 'Sesion no encontrada para el ciclo seleccionado.') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
};

const deleteAttendanceSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { cycleId } = req.query;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere un ciclo activo.' });
    }

    const result = await attendanceService.deleteSession(sessionId, cycleId);
    res.status(200).json(result);
  } catch (error) {
    if (
      error.message === 'ID de sesion invalido.' ||
      error.message === 'ID de ciclo invalido.'
    ) {
      return res.status(400).json({ error: error.message });
    }

    if (error.message === 'Sesion no encontrada para el ciclo seleccionado.') {
      return res.status(404).json({ error: error.message });
    }

    if (error.message === 'Solo se pueden eliminar sesiones en curso.') {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
};

const reopenAttendanceSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { cycleId } = req.query;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere un ciclo activo.' });
    }

    const session = await attendanceService.reopenSession(sessionId, cycleId);

    res.status(200).json({
      message: 'Sesion reaperturada correctamente.',
      session,
    });
  } catch (error) {
    if (error.message === 'Sesion no encontrada para el ciclo seleccionado.') {
      return res.status(404).json({ error: error.message });
    }

    if (error.message === 'Solo se pueden reaperturar sesiones finalizadas.') {
      return res.status(400).json({ error: error.message });
    }

    if (error.message === 'ID de sesion invalido.' || error.message === 'ID de ciclo invalido.') {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
};

const getMyAttendanceHistory = async (req, res, next) => {
  try {
    const history = await attendanceService.getAttendanceHistoryForUser(req.user.id);
    res.status(200).json(history);
  } catch (error) {
    if (error.message === 'ID de usuario invalido.') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

const getStudentAttendanceHistory = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { cycleId } = req.query;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere un ciclo activo.' });
    }

    const result = await attendanceService.getAttendanceHistoryForStudentInCycle(studentId, cycleId);
    res.status(200).json(result);
  } catch (error) {
    if (
      error.message === 'ID de estudiante invalido.' ||
      error.message === 'ID de ciclo invalido.'
    ) {
      return res.status(400).json({ error: error.message });
    }

    if (
      error.message === 'Estudiante no encontrado.' ||
      error.message === 'El estudiante no pertenece al ciclo activo.'
    ) {
      return res.status(404).json({ error: error.message });
    }

    next(error);
  }
};

const exportStudentAttendanceHistory = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { cycleId } = req.query;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere un ciclo activo.' });
    }

    const { buffer, fileName } = await attendanceService.exportAttendanceHistoryToExcel(studentId, cycleId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    if (
      error.message === 'ID de estudiante invalido.' ||
      error.message === 'ID de ciclo invalido.'
    ) {
      return res.status(400).json({ error: error.message });
    }

    if (
      error.message === 'Estudiante no encontrado.' ||
      error.message === 'El estudiante no pertenece al ciclo activo.'
    ) {
      return res.status(404).json({ error: error.message });
    }

    next(error);
  }
};

const getPuzzleData = async (req, res, next) => {
  try {
    const { cycleId, modality, group, sessionType, startDate, endDate } = req.query;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere un ciclo activo.' });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Se requiere rango de fechas (startDate, endDate).' });
    }

    const diffDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    if (diffDays >= 31) {
      return res.status(400).json({ error: 'El rango de fechas no puede exceder 31 dias.' });
    }

    const result = await attendanceService.getPuzzleData(cycleId, {
      modality: modality || 'PRE_U',
      group,
      sessionType,
      startDate,
      endDate,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const exportPuzzleToExcel = async (req, res, next) => {
  try {
    const { cycleId, modality, group, sessionType, startDate, endDate } = req.query;

    if (!cycleId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Se requiere ciclo y rango de fechas.' });
    }

    const { buffer, fileName } = await attendanceService.exportPuzzleToExcel(cycleId, {
      modality: modality || 'PRE_U',
      group,
      sessionType,
      startDate,
      endDate,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(Buffer.from(buffer));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStudentListForAttendance,
  recordAttendance,
  checkMatriculadorRole,
  startAttendanceProcess,
  endAttendanceProcess,
  getAllSessions,
  getSessionDetails,
  deleteAttendanceSession,
  reopenAttendanceSession,
  getMyAttendanceHistory,
  getStudentAttendanceHistory,
  exportStudentAttendanceHistory,
  getPuzzleData,
  exportPuzzleToExcel,
};
