const express = require('express');
const router = express.Router();
const studentController = require('../../controllers/studentController');
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { uploadBulkEnrollmentFile } = require('../../middlewares/bulkEnrollmentUploadMiddleware');
const { uploadStudentProfileImage } = require('../../middlewares/imageUploadMiddleware');

// Aplicar middleware de autenticación a todas las rutas de estudiantes
router.use(authMiddleware);

// GET /api/students -> Obtener la lista de estudiantes para el módulo de matrícula
router.get('/', studentController.getAllStudents);

// POST /api/students/enrollment -> Matricular a un nuevo estudiante
router.post('/enrollment', studentController.enrollStudent);

// GET /api/students/search -> Buscar estudiantes por DNI, nombre o apellido
router.get('/search', studentController.searchStudents);

// POST /api/students/bulk-enrollment/preview -> Vista previa de matricula masiva por Excel
router.post('/bulk-enrollment/preview', uploadBulkEnrollmentFile.single('file'), studentController.previewBulkEnrollment);

// POST /api/students/bulk-enrollment/commit -> Confirmar matricula masiva por Excel
router.post('/bulk-enrollment/commit', studentController.commitBulkEnrollment);

// POST /api/students/profile-image -> Subir foto de perfil para matricula
router.post('/profile-image', uploadStudentProfileImage('profilePicture'), studentController.uploadProfileImage);

// POST /api/students/academic-cards/print-sheet -> Descargar plancha compacta A4
router.post('/academic-cards/print-sheet', studentController.generateAcademicCardSheet);

// GET /api/students/:id/academic-card -> Descargar carnet académico del estudiante
router.get('/:id/academic-card', studentController.generateAcademicCard);

// NUEVO: PUT /api/students/:id -> Actualizar datos de un estudiante
router.put('/:id', studentController.updateStudent);
// vamos a extraer todos los datos del estudiante y su matricula para actualizarlo, no solo el estado de matricula, sino tambien su informacion personal, asi como su ciclo, curso, paralelo, etc.
router.get('/:id', studentController.getStudentById);


module.exports = router;
