const simulationService = require('../services/simulationService');
const prisma = require('../utils/prismaClient');
const path = require('path');
const fs = require('fs');

const deleteInstance = async (req, res) => {
  const { instanceId } = req.params;

  try {
    const result = await simulationService.deleteSimulationInstance(instanceId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error en deleteInstance controller:', error);
    return res.status(error.message === 'Instancia no encontrada' ? 404 : 500)
      .json({ error: error.message || 'Error interno al eliminar la instancia' });
  }
};

const deleteEvent = async (req, res) => {
  const { eventId } = req.params;

  try {
    const result = await simulationService.deleteSimulationEvent(eventId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error en deleteEvent controller:', error);
    return res.status(error.message === 'Evento no encontrado' ? 404 : 500)
      .json({ error: error.message || 'Error interno al eliminar el evento' });
  }
};

const createAcademicModality = async (req, res, next) => {
  try {
    const modalityData = req.body;
    const newModality = await simulationService.createAcademicModality(modalityData);
    res.status(201).json({ message: 'Modalidad academica creada exitosamente', modality: newModality });
  } catch (error) {
    next(error);
  }
};

const getAcademicModalities = async (req, res, next) => {
  try {
    const modalities = await simulationService.getAcademicModalities();
    res.status(200).json(modalities);
  } catch (error) {
    next(error);
  }
};

const getSimulationEventsByModality = async (req, res, next) => {
  try {
    const { modalityId } = req.params;
    const events = await simulationService.getSimulationEventsByModality(parseInt(modalityId, 10));
    res.status(200).json(events);
  } catch (error) {
    next(error);
  }
};

const createSimulationEvent = async (req, res, next) => {
  try {
    const { cycleId, name, totalQuestions, thematicSeparation } = req.body;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere un ciclo activo.' });
    }

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'El nombre del evento es obligatorio.' });
    }

    const newEvent = await simulationService.createSimulationEvent({
      cycleId,
      name: String(name).trim(),
      totalQuestions,
      thematicSeparation,
    });
    res.status(201).json({ message: 'Evento de simulacro creado exitosamente', event: newEvent });
  } catch (error) {
    if (error.message === 'ID de ciclo invalido.') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

const getSimulationEvents = async (req, res, next) => {
  try {
    const { cycleId } = req.query;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere un ciclo activo.' });
    }

    const events = await simulationService.getSimulationEvents(cycleId);
    res.status(200).json(events);
  } catch (error) {
    if (error.message === 'ID de ciclo invalido.') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

const saveEventAnswerKey = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { answerKey } = req.body;

    if (!answerKey || typeof answerKey !== 'object') {
      return res.status(400).json({ error: 'La clave de respuestas es requerida y debe ser un objeto JSON.' });
    }

    const updatedEvent = await simulationService.saveSimulationEventAnswerKey(parseInt(eventId, 10), answerKey);
    res.status(200).json({ message: 'Clave de respuestas del evento actualizada exitosamente', event: updatedEvent });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Evento de simulacro no encontrado.' });
    }
    next(error);
  }
};

const getSimulationInstancesByEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { cycleId } = req.query;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere un ciclo activo.' });
    }

    const instances = await simulationService.getSimulationInstancesByEvent(parseInt(eventId, 10), cycleId);
    res.status(200).json(instances);
  } catch (error) {
    next(error);
  }
};

const validateStudentCodes = async (req, res, next) => {
  try {
    const { codes, cycleId } = req.body;

    if (!Array.isArray(codes) || codes.length === 0) {
      return res.status(400).json({ error: 'Se requieren codigos de estudiante para la validacion.' });
    }

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere un ciclo activo.' });
    }

    const validationResults = await simulationService.validateStudentCodes(codes, cycleId);
    res.status(200).json(validationResults);
  } catch (error) {
    if (error.message === 'ID de ciclo invalido.') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

const initiateSimulationUpload = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'El archivo (campo "file") es obligatorio.' });
  }

  try {
    const { eventId } = req.params;
    const { cycleId } = req.body;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere un ciclo activo.' });
    }

    await simulationService.assertEventBelongsToCycle(eventId, cycleId);

    const relativePath = `tmp/simulations/${req.file.filename}`;

    const instance = await prisma.simulationInstance.create({
      data: {
        fileName: req.file.filename,
        filePath: relativePath,
        importType: 'RAW',
        cycle: {
          connect: { id: parseInt(cycleId, 10) },
        },
        event: {
          connect: { id: parseInt(eventId, 10) },
        },
        uploader: {
          connect: { id: req.user.id },
        },
      },
    });

    res.status(201).json(instance);
  } catch (error) {
    console.error('ERROR AL CREAR EN DB', error);
    if (
      error.message === 'ID de ciclo invalido.' ||
      error.message === 'El evento no pertenece al ciclo seleccionado.' ||
      error.message === 'Evento de simulacro no encontrado.'
    ) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Error al iniciar la subida.' });
  }
};

const rollbackFailedInstance = async (instanceId, filePath) => {
  if (instanceId) {
    await prisma.simulationResult.deleteMany({
      where: { simulationInstanceId: instanceId },
    });
    await prisma.simulationInstance.delete({
      where: { id: instanceId },
    }).catch(() => null);
  }
  if (filePath && fs.existsSync(filePath)) {
    fs.unlink(filePath, () => null);
  }
};

const processRawSimulationResults = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'El archivo (campo "file") es obligatorio.' });
  }

  let instance = null;

  try {
    const { eventId } = req.params;
    const { cycleId, instanceName } = req.body;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere un ciclo activo.' });
    }

    if (!instanceName || !instanceName.trim()) {
      return res.status(400).json({ error: 'El nombre de la instancia es obligatorio.' });
    }

    await simulationService.assertEventBelongsToCycle(eventId, cycleId);

    const relativePath = `tmp/simulations/${req.file.filename}`;
    const displayName = String(instanceName).trim();

    instance = await prisma.simulationInstance.create({
      data: {
        fileName: displayName,
        filePath: relativePath,
        importType: 'RAW',
        cycle: {
          connect: { id: parseInt(cycleId, 10) },
        },
        event: {
          connect: { id: parseInt(eventId, 10) },
        },
        uploader: {
          connect: { id: req.user.id },
        },
      },
    });

    const result = await simulationService.processSimulationResults(instance.id, cycleId);

    res.status(201).json({
      instanceId: instance.id,
      message: result.message || 'Resultados del simulacro procesados exitosamente.',
      summary: result,
    });
  } catch (error) {
    console.error('ERROR AL PROCESAR RESULTADOS RAW', error);
    await rollbackFailedInstance(instance?.id, req.file?.path);
    if (
      error.message === 'ID de ciclo invalido.' ||
      error.message === 'El evento no pertenece al ciclo seleccionado.' ||
      error.message === 'Evento de simulacro no encontrado.'
    ) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'Instancia no encontrada para el ciclo seleccionado.') {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message || 'Error al procesar los resultados del simulacro.' });
  }
};

const importProcessedSimulationResults = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'El archivo (campo "file") es obligatorio.' });
  }

  let instance = null;

  try {
    const { eventId } = req.params;
    const { cycleId, instanceName } = req.body;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere un ciclo activo.' });
    }

    if (!instanceName || !instanceName.trim()) {
      return res.status(400).json({ error: 'El nombre de la instancia es obligatorio.' });
    }

    await simulationService.assertEventBelongsToCycle(eventId, cycleId);

    const relativePath = `tmp/simulations/${req.file.filename}`;
    const displayName = String(instanceName).trim();

    instance = await prisma.simulationInstance.create({
      data: {
        fileName: displayName,
        filePath: relativePath,
        importType: 'PROCESSED',
        cycle: {
          connect: { id: parseInt(cycleId, 10) },
        },
        event: {
          connect: { id: parseInt(eventId, 10) },
        },
        uploader: {
          connect: { id: req.user.id },
        },
      },
    });

    const result = await simulationService.importProcessedSimulationResults(instance.id, cycleId);

    res.status(201).json({
      instanceId: instance.id,
      message: 'Resultados procesados importados exitosamente.',
      summary: result.summary,
    });
  } catch (error) {
    console.error('ERROR AL IMPORTAR RESULTADOS PROCESADOS', error);
    await rollbackFailedInstance(instance?.id, req.file?.path);
    if (error.message === 'Instancia no encontrada para el ciclo seleccionado.') {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message || 'Error al importar los resultados procesados.' });
  }
};

const uploadSimulationFile = async (req, res, next) => {
  try {
    const { instanceId } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningun archivo.' });
    }

    const absolutePath = path.resolve(req.file.path);

    const updatedInstance = await prisma.simulationInstance.update({
      where: { id: parseInt(instanceId, 10) },
      data: { filePath: absolutePath },
    });

    res.status(200).json({
      message: 'Archivo subido con exito',
      filePath: updatedInstance.filePath,
    });
  } catch (error) {
    next(error);
  }
};

const processSimulationResults = async (req, res, next) => {
  try {
    const { instanceId } = req.params;
    const { cycleId } = req.body;

    const result = await simulationService.processSimulationResults(instanceId, cycleId);
    res.status(200).json({ message: 'Resultados del simulacro procesados exitosamente', result });
  } catch (error) {
    if (error.message === 'Instancia no encontrada para el ciclo seleccionado.') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
};

const getSimulationResults = async (req, res, next) => {
  try {
    const { instanceId } = req.params;
    const { cycleId } = req.query;

    const results = await simulationService.getSimulationResults(instanceId, cycleId);
    res.status(200).json(results);
  } catch (error) {
    if (error.message === 'Instancia no encontrada para el ciclo seleccionado.') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
};

const exportSimulationResults = async (req, res, next) => {
  try {
    const { instanceId } = req.params;
    const { cycleId } = req.query;

    const excelBuffer = await simulationService.exportSimulationResults(instanceId, cycleId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=resultados_simulacro_${instanceId}.xlsx`);
    res.status(200).send(excelBuffer);
  } catch (error) {
    if (error.message === 'No hay resultados para exportar en esta instancia.') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Instancia no encontrada para el ciclo seleccionado.') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
};

const searchStudents = async (req, res, next) => {
  try {
    const { q, cycleId } = req.query;
    if (!q || String(q).trim().length < 3) {
      return res.status(400).json({ error: 'La búsqueda debe tener al menos 3 caracteres.' });
    }
    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere un ciclo activo.' });
    }
    const students = await simulationService.searchStudents(q.trim(), cycleId);
    res.status(200).json(students);
  } catch (error) {
    next(error);
  }
};

const getStudentAcademicStatus = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { cycleId } = req.query;
    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere un ciclo activo.' });
    }
    const status = await simulationService.getStudentAcademicStatus(
      parseInt(studentId, 10), cycleId
    );
    res.status(200).json(status);
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

module.exports = {
  createAcademicModality,
  getAcademicModalities,
  getSimulationEventsByModality,
  createSimulationEvent,
  getSimulationEvents,
  saveEventAnswerKey,
  getSimulationInstancesByEvent,
  validateStudentCodes,
  initiateSimulationUpload,
  processRawSimulationResults,
  uploadSimulationFile,
  processSimulationResults,
  importProcessedSimulationResults,
  getSimulationResults,
  exportSimulationResults,
  checkMatriculadorRole,
  deleteEvent,
  deleteInstance,
  searchStudents,
  getStudentAcademicStatus,
};
