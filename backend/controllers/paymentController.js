const paymentService = require('../services/paymentService');

const checkPaymentsRole = (req, res, next) => {
  const roleName = req.user?.role?.name;

  if (roleName !== 'admin' && roleName !== 'matriculador') {
    return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente.' });
  }

  next();
};

const getStudentPaymentSummary = async (req, res, next) => {
  try {
    const { documentId, cycleId } = req.query;

    if (!documentId || !cycleId) {
      return res.status(400).json({ error: 'Se requiere DNI y ciclo activo.' });
    }

    const summary = await paymentService.getStudentPaymentSummary(documentId, cycleId);
    res.status(200).json(summary);
  } catch (error) {
    if (
      error.message === 'El estudiante no está matriculado en el ciclo activo.' ||
      error.message === 'El estudiante no tiene un acuerdo de pago en el ciclo activo.'
    ) {
      return res.status(404).json({ error: error.message });
    }

    if (
      error.message === 'ID de ciclo invalido.' ||
      error.message === 'El DNI debe contener exactamente 8 dígitos numéricos.'
    ) {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
};

const getPaymentHistory = async (req, res, next) => {
  try {
    const { documentId, cycleId } = req.query;

    if (!documentId || !cycleId) {
      return res.status(400).json({ error: 'Se requiere DNI y ciclo activo.' });
    }

    const history = await paymentService.getPaymentHistory(documentId, cycleId);
    res.status(200).json(history);
  } catch (error) {
    if (
      error.message === 'El estudiante no está matriculado en el ciclo activo.' ||
      error.message === 'El estudiante no tiene un acuerdo de pago en el ciclo activo.'
    ) {
      return res.status(404).json({ error: error.message });
    }

    if (
      error.message === 'ID de ciclo invalido.' ||
      error.message === 'El DNI debe contener exactamente 8 dígitos numéricos.'
    ) {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
};

const registerPayment = async (req, res, next) => {
  try {
    const { documentId, cycleId, amountPaid, receiptNumber } = req.body;

    if (!documentId || !cycleId) {
      return res.status(400).json({ error: 'Se requiere DNI y ciclo activo.' });
    }

    const result = await paymentService.registerPayment({
      documentId,
      cycleId,
      amountPaid,
      receiptNumber,
      receivedById: req.user.id,
    });

    res.status(201).json({
      message: 'Pago registrado correctamente.',
      transaction: result.transaction,
      agreement: result.agreement,
    });
  } catch (error) {
    if (
      error.message === 'El estudiante no está matriculado en el ciclo activo.' ||
      error.message === 'El estudiante no tiene un acuerdo de pago en el ciclo activo.'
    ) {
      return res.status(404).json({ error: error.message });
    }

    if (
      error.message === 'El monto pagado debe ser mayor que 0.' ||
      error.message === 'El monto pagado no puede superar el saldo pendiente.' ||
      error.message === 'ID de ciclo invalido.' ||
      error.message === 'Monto pagado invalido.' ||
      error.message === 'El DNI debe contener exactamente 8 dígitos numéricos.' ||
      error.message === 'El número de recibo solo admite valores numéricos.' ||
      error.message === 'Ciclo terminado'
    ) {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
};

const registerDiscount = async (req, res, next) => {
  try {
    const { documentId, cycleId, discountAmount } = req.body;

    if (!documentId || !cycleId) {
      return res.status(400).json({ error: 'Se requiere DNI y ciclo activo.' });
    }

    const result = await paymentService.registerDiscount({
      documentId,
      cycleId,
      discountAmount,
      receivedById: req.user.id,
    });

    res.status(201).json({
      message: 'Descuento aplicado correctamente.',
      transaction: result.transaction,
      agreement: result.agreement,
    });
  } catch (error) {
    if (
      error.message === 'El estudiante no está matriculado en el ciclo activo.' ||
      error.message === 'El estudiante no tiene un acuerdo de pago en el ciclo activo.'
    ) {
      return res.status(404).json({ error: error.message });
    }

    if (
      error.message === 'El monto del descuento debe ser mayor que 0.' ||
      error.message === 'El descuento no puede superar el saldo pendiente.' ||
      error.message === 'ID de ciclo invalido.' ||
      error.message === 'Monto del descuento invalido.' ||
      error.message === 'El DNI debe contener exactamente 8 dígitos numéricos.' ||
      error.message === 'Ciclo terminado'
    ) {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
};

const retireStudent = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { cycleId } = req.body;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere ciclo activo.' });
    }

    const updatedUser = await paymentService.retireStudent(userId, cycleId);

    res.status(200).json({
      message: 'Estudiante dado de baja correctamente.',
      user: updatedUser,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Estudiante no encontrado.' });
    }

    if (
      error.message === 'ID de usuario invalido.' ||
      error.message === 'ID de ciclo invalido.' ||
      error.message === 'Ciclo terminado'
    ) {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
};

const getCyclePaymentSummary = async (req, res, next) => {
  try {
    const { cycleId } = req.query;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere ciclo activo.' });
    }

    const summary = await paymentService.getCyclePaymentSummary(cycleId);
    res.status(200).json(summary);
  } catch (error) {
    if (error.message === 'ID de ciclo invalido.') {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
};

const getCyclePaymentHistory = async (req, res, next) => {
  try {
    const { cycleId } = req.query;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere ciclo activo.' });
    }

    const history = await paymentService.getCyclePaymentHistory(cycleId);
    res.status(200).json(history);
  } catch (error) {
    if (error.message === 'ID de ciclo invalido.') {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
};

const searchStudentsForPayments = async (req, res, next) => {
  try {
    const { cycleId, q } = req.query;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere ciclo activo.' });
    }

    if (!q) {
      return res.status(400).json({ error: 'Se requiere un término de búsqueda.' });
    }

    const students = await paymentService.searchStudentsForPayments(cycleId, q);
    res.status(200).json(students);
  } catch (error) {
    if (
      error.message === 'ID de ciclo invalido.' ||
      error.message === 'El término de búsqueda debe tener al menos 3 caracteres.'
    ) {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
};

const activateStudent = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { cycleId } = req.body;

    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere ciclo activo.' });
    }

    const updatedUser = await paymentService.activateStudent(userId, cycleId);

    res.status(200).json({
      message: 'Estudiante activado correctamente.',
      user: updatedUser,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Estudiante no encontrado.' });
    }

    if (
      error.message === 'ID de usuario invalido.' ||
      error.message === 'ID de ciclo invalido.' ||
      error.message === 'Ciclo terminado'
    ) {
      return res.status(400).json({ error: error.message });
    }

    next(error);
  }
};

module.exports = {
  activateStudent,
  checkPaymentsRole,
  getCyclePaymentSummary,
  getCyclePaymentHistory,
  searchStudentsForPayments,
  getStudentPaymentSummary,
  getPaymentHistory,
  registerPayment,
  registerDiscount,
  retireStudent,
};
