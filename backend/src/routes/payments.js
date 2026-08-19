const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/paymentController');
const { authMiddleware } = require('../../middlewares/authMiddleware');

router.use(authMiddleware);
router.use(paymentController.checkPaymentsRole);

router.get('/cycle-summary', paymentController.getCyclePaymentSummary);
router.get('/cycle-history', paymentController.getCyclePaymentHistory);
router.get('/search', paymentController.searchStudentsForPayments);
router.get('/student-summary', paymentController.getStudentPaymentSummary);
router.get('/history', paymentController.getPaymentHistory);
router.post('/register', paymentController.registerPayment);
router.post('/discount', paymentController.registerDiscount);
router.post('/student/:userId/retire', paymentController.retireStudent);
router.post('/student/:userId/activate', paymentController.activateStudent);

module.exports = router;
