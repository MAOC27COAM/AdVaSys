const express = require('express');
const router = express.Router();
const cycleController = require('../../controllers/cycleController');
const { authMiddleware } = require('../../middlewares/authMiddleware');

// Aplicar middleware de autenticación a todas las rutas de ciclos
router.use(authMiddleware);

// --- Rutas para la Gestión de Ciclos ---
// POST /api/cycles -> Crear un nuevo ciclo
router.post('/', cycleController.createCycle);
// GET /api/cycles -> Obtener todos los ciclos
router.get('/', cycleController.getAllCycles);
// GET /api/cycles/:id -> Obtener un ciclo por ID
router.get('/:id', cycleController.getCycleById);
// PUT /api/cycles/:id -> Actualizar un ciclo por ID
router.put('/:id', cycleController.updateCycle);
// DELETE /api/cycles/:id -> Eliminar un ciclo por ID
router.delete('/:id', cycleController.deleteCycle);

// --- Rutas para la Gestión de Matrículas en Ciclos ---
// GET /api/cycles/:cycleId/enrollments -> Obtener todas las matrículas de un ciclo
router.get('/:cycleId/enrollments', cycleController.getCycleEnrollments);

// Rutas para matrículas de ciclo individuales (por su propio ID)
// GET /api/cycle-enrollments/:id -> Obtener una matrícula de ciclo por ID
router.get('/cycle-enrollments/:id', cycleController.getCycleEnrollmentById);
// PUT /api/cycle-enrollments/:id -> Actualizar una matrícula de ciclo por ID
router.put('/cycle-enrollments/:id', cycleController.updateCycleEnrollment);
// DELETE /api/cycle-enrollments/:id -> Eliminar una matrícula de ciclo por ID
router.delete('/cycle-enrollments/:id', cycleController.deleteCycleEnrollment);

// --- Rutas para la Gestión de Cuotas de Pago ---
// PUT /api/installments/:id/status -> Actualizar el estado de una cuota de pago
router.put('/installments/:id/status', cycleController.updatePaymentInstallmentStatus);
// GET /api/agreements/:agreementId/installments -> Obtener todas las cuotas de un acuerdo de pago
router.get('/agreements/:agreementId/installments', cycleController.getInstallmentsByAgreementId);

module.exports = router;
