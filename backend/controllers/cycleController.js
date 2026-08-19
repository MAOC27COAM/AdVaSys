const cycleService = require('../services/cycleService');
const { getRoleName } = require('../middlewares/roleGuard');
const { createHttpError } = require('../utils/httpError');

module.exports = {
  // --- Controladores para Ciclos ---

  createCycle: async (req, res) => {
    const roleName = getRoleName(req.user)
    try {
      // Solo administradores puede n crear ciclos
      if (!['admin', 'matriculador', 'kami'].includes(roleName)) {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden crear ciclos.' });
      }
      const cycle = await cycleService.createCycle(req.body);
      res.status(201).json(cycle);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getAllCycles: async (req, res) => {
    try {
      const cycles = await cycleService.getAllCycles();
      res.json(cycles);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getCycleById: async (req, res) => {
    try {
      const cycle = await cycleService.getCycleById(req.params.id);
      if (!cycle) return res.status(404).json({ error: 'Ciclo no encontrado.' });
      res.json(cycle);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateCycle: async (req, res) => {
    const roleName = getRoleName(req.user)
    try {
      // Solo administradores pueden actualizar ciclos
      if (!['admin', 'matriculador', 'kami'].includes(roleName)) {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden actualizar ciclos.' });
      }
      const updatedCycle = await cycleService.updateCycle(req.params.id, req.body);
      res.json(updatedCycle);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  deleteCycle: async (req, res) => {
    const roleName = getRoleName(req.user)
    try {
      // Solo administradores pueden eliminar ciclos
      if (!['admin', 'matriculador', 'kami'].includes(roleName)) {
        return res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden eliminar ciclos.' });
      }
      await cycleService.deleteCycle(req.params.id);
      res.json({ message: 'Ciclo eliminado exitosamente.' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // --- Controladores para Matrículas en Ciclos ---

  enrollStudentInCycle: async (req, res) => {
    const roleName = getRoleName(req.user)
    try {
      // Solo administradores y matriculadores pueden matricular estudiantes
      if (!['admin', 'matriculador', 'kami'].includes(roleName)) {
        return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente para matricular estudiantes.' });
      }
      const { userId, paymentAgreementData } = req.body;
      const { cycleId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: 'Falta el ID del usuario para la matrícula.' });
      }

      const enrollment = await cycleService.enrollStudentInCycle(parseInt(userId), parseInt(cycleId), paymentAgreementData, req.user.id);
      res.status(201).json(enrollment);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getCycleEnrollments: async (req, res) => {
    try {
      // Todos los roles pueden ver las matrículas de un ciclo, pero un estudiante solo las suyas
      // La lógica de filtrado por estudiante se haría en el servicio si fuera necesario
      const { cycleId } = req.params;
      const enrollments = await cycleService.getCycleEnrollments(cycleId);
      res.json(enrollments);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getCycleEnrollmentById: async (req, res) => {
    try {
      const enrollment = await cycleService.getCycleEnrollmentById(req.params.id);
      if (!enrollment) return res.status(404).json({ error: 'Matrícula de ciclo no encontrada.' });
      res.json(enrollment);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateCycleEnrollment: async (req, res) => {
    const roleName = getRoleName(req.user)
    try {
      // Solo administradores y matriculadores pueden actualizar matrículas
      if (!['admin', 'matriculador', 'kami'].includes(roleName)) {
        return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente para actualizar matrículas.' });
      }
      const updatedEnrollment = await cycleService.updateCycleEnrollment(req.params.id, req.body);
      res.json(updatedEnrollment);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  deleteCycleEnrollment: async (req, res) => {
    const roleName = getRoleName(req.user)
    try {
      // Solo administradores y matriculadores pueden eliminar matrículas
      if (!['admin', 'matriculador', 'kami'].includes(roleName)) {
        return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente para eliminar matrículas.' });
      }
      await cycleService.deleteCycleEnrollment(req.params.id);
      res.json({ message: 'Matrícula de ciclo eliminada exitosamente.' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  // --- Controladores para Cuotas de Pago ---

  updatePaymentInstallmentStatus: async (req, res) => {
    const roleName = getRoleName(req.user)
    try {
      // Solo administradores y matriculadores pueden actualizar el estado de las cuotas
      if (!['admin', 'matriculador', 'kami'].includes(roleName)) {
        return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente para actualizar cuotas de pago.' });
      }
      const { status, paidAt } = req.body;
      if (!status) {
        return res.status(400).json({ error: 'Falta el estado de la cuota.' });
      }
      const updatedInstallment = await cycleService.updatePaymentInstallmentStatus(req.params.id, status, paidAt);
      res.json(updatedInstallment);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  getInstallmentsByAgreementId: async (req, res) => {
    try {
      // Todos los roles pueden ver las cuotas de un acuerdo, pero se podría añadir lógica de autorización más fina
      const installments = await cycleService.getInstallmentsByAgreementId(req.params.agreementId);
      res.json(installments);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
