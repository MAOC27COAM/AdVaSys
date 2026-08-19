const studentService = require('../services/studentService');
const { generateAcademicCardPdf, generateAcademicCardSheetPdf } = require('../utils/academicCardGenerator');
const bulkEnrollmentService = require('../services/bulkEnrollmentService');

const hasEnrollmentAccess = (userRole) => userRole === 'admin' || userRole === 'matriculador' || userRole === 'kami';

module.exports = {
  updateStudent: async (req, res) => {
    try {
      const userRole = req.user?.role?.name;
      if (!hasEnrollmentAccess(userRole)) {
        return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente.' });
      }

      const { id } = req.params;
      const updateData = req.body;
      const updatedUser = await studentService.updateStudent(id, updateData);

      return res.status(200).json({
        message: 'Estudiante actualizado exitosamente',
        data: updatedUser,
      });
    } catch (error) {
      console.error('Error en updateStudent controller:', error);
      return res.status(400).json({ error: error.message });
    }
  },

  getAllStudents: async (req, res, next) => {
    try {
      const userRole = req.user?.role?.name;
      if (!hasEnrollmentAccess(userRole)) {
        return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente.' });
      }

      const { cycleId, q } = req.query;
      if (!cycleId) {
        return res.status(400).json({ error: 'Se requiere un ID de ciclo para obtener los estudiantes.' });
      }

      const students = await studentService.getAllStudentsForMatricula(cycleId, q);
      return res.json(students);
    } catch (error) {
      next(error);
    }
  },

  enrollStudent: async (req, res) => {
    try {
      const userRole = req.user?.role?.name;
      if (!hasEnrollmentAccess(userRole)) {
        return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente.' });
      }

      const { userData, studentProfileData, cycleId } = req.body;
      if (!userData || !studentProfileData || !cycleId) {
        return res.status(400).json({ error: 'Faltan datos requeridos para la matrícula.' });
      }

      const enrollmentResult = await studentService.enrollNewStudent(req.body, req.user.id);
      return res.status(201).json({
        message: enrollmentResult.reusedExistingStudent
          ? 'Estudiante recurrente matriculado exitosamente en el nuevo ciclo.'
          : 'Estudiante matriculado exitosamente.',
        user: enrollmentResult.user,
        cycleEnrollmentId: enrollmentResult.cycleEnrollmentId,
        reusedExistingStudent: enrollmentResult.reusedExistingStudent,
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },

  searchStudents: async (req, res, next) => {
    try {
      const userRole = req.user?.role?.name;
      if (!hasEnrollmentAccess(userRole)) {
        return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente.' });
      }

      const { cycleId, q } = req.query;
      if (!cycleId) {
        return res.status(400).json({ error: 'Se requiere un ID de ciclo para buscar estudiantes.' });
      }
      if (!q) {
        return res.status(400).json({ error: 'Se requiere un término de búsqueda.' });
      }

      const students = await studentService.getAllStudentsForMatricula(cycleId, q);
      return res.json(students);
    } catch (error) {
      next(error);
    }
  },

  getStudentById: async (req, res, next) => {
    try {
      const userRole = req.user?.role?.name;
      if (!hasEnrollmentAccess(userRole)) {
        return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente.' });
      }

      const { id } = req.params;
      const { cycleId } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'ID requerido' });
      }

      const student = await studentService.getStudentFullDetails(id, cycleId);
      if (!student) {
        return res.status(404).json({ error: 'Estudiante no encontrado' });
      }

      return res.json(student);
    } catch (error) {
      next(error);
    }
  },

  generateAcademicCard: async (req, res) => {
    try {
      const userRole = req.user?.role?.name;
      if (!hasEnrollmentAccess(userRole)) {
        return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente.' });
      }

      const { id } = req.params;
      const { cycleId } = req.query;

      if (!id || !cycleId) {
        return res.status(400).json({ error: 'Se requiere el estudiante y el ciclo para generar el carnet.' });
      }

      const cardData = await studentService.getStudentAcademicCardData(id, cycleId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="carnet-${cardData.documentId}.pdf"`);

      await generateAcademicCardPdf(cardData, res);
      return undefined;
    } catch (error) {
      const notFoundMessages = [
        'Estudiante no encontrado.',
        'El estudiante no está matriculado en el ciclo activo.',
      ];
      const statusCode = notFoundMessages.includes(error.message) ? 404 : 400;
      return res.status(statusCode).json({ error: error.message });
    }
  },

  generateAcademicCardSheet: async (req, res) => {
    try {
      const userRole = req.user?.role?.name;
      if (!hasEnrollmentAccess(userRole)) {
        return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente.' });
      }

      const { cycleId, studentIds } = req.body;
      if (!cycleId || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ error: 'Se requiere el ciclo y una selección válida de estudiantes.' });
      }

      const cardsData = await studentService.getStudentsAcademicCardDataBatch(studentIds, cycleId);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="plancha-carnets-${cycleId}.pdf"`);

      await generateAcademicCardSheetPdf(cardsData, res);
      return undefined;
    } catch (error) {
      const notFoundMessages = [
        'Uno o más estudiantes seleccionados no existen.',
        'Uno o más estudiantes no están matriculados en el ciclo activo.',
      ];
      const statusCode = notFoundMessages.includes(error.message) ? 404 : 400;
      return res.status(statusCode).json({ error: error.message });
    }
  },

  previewBulkEnrollment: async (req, res) => {
    try {
      const userRole = req.user?.role?.name;
      if (!hasEnrollmentAccess(userRole)) {
        return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente.' });
      }

      const { cycleId } = req.body;
      if (!cycleId || !req.file) {
        return res.status(400).json({ error: 'Se requiere el ciclo y un archivo Excel valido.' });
      }

      const preview = await bulkEnrollmentService.previewBulkEnrollment(req.file.buffer, cycleId);
      return res.status(200).json(preview);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },

  uploadProfileImage: async (req, res) => {
    try {
      const userRole = req.user?.role?.name;
      if (!hasEnrollmentAccess(userRole)) {
        return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente.' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Debes adjuntar una imagen de perfil valida.' });
      }

      return res.status(200).json({
        message: 'Imagen de perfil subida correctamente.',
        imageUrl: `/uploads/profile-pictures/${req.file.filename}`,
      });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },

  commitBulkEnrollment: async (req, res) => {
    try {
      const userRole = req.user?.role?.name;
      if (!hasEnrollmentAccess(userRole)) {
        return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente.' });
      }

      const { cycleId, rows } = req.body;
      if (!cycleId || !Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: 'Se requiere el ciclo y filas validadas para importar.' });
      }

      const result = await bulkEnrollmentService.commitBulkEnrollment({
        cycleId,
        rows,
        receivedById: req.user.id,
      });

      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },
};
