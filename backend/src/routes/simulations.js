// backend/src/routes/simulations.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
const simulationController = require('../../controllers/simulationController');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // NUEVO: Importar fs para crear directorios

router.use(authMiddleware);

// Middleware para verificar rol (Matriculador o Admin) - Reutilizamos el del controlador
const checkMatriculadorRole = simulationController.checkMatriculadorRole;

// --- Nuevas Rutas de Eventos de Simulacro (solo MATRICULADOR) ---
router.post('/events', checkMatriculadorRole, simulationController.createSimulationEvent);
router.get('/events', checkMatriculadorRole, simulationController.getSimulationEvents); // Ruta añadida
router.put('/events/:eventId/answer-key', checkMatriculadorRole, simulationController.saveEventAnswerKey);
router.get('/events/:eventId/instances', checkMatriculadorRole, simulationController.getSimulationInstancesByEvent);

// --- Rutas de Validación (solo MATRICULADOR) ---
router.post('/validate-codes', checkMatriculadorRole, simulationController.validateStudentCodes);

// --- Rutas de Modalidades Académicas (solo MATRICULADOR) ---
router.post('/academic-modalities', checkMatriculadorRole, simulationController.createAcademicModality);
router.get('/academic-modalities', checkMatriculadorRole, simulationController.getAcademicModalities);
router.get('/academic-modalities/:modalityId/events', checkMatriculadorRole, simulationController.getSimulationEventsByModality);

// Configuración de Multer para almacenar archivos temporalmente
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', '..', 'tmp', 'simulations');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    console.log("DEBUG: Multer recibió archivo:", file.originalname);
    console.log("DEBUG: Multer recibió body:", req.body);

    // 1. Usar un nombre personalizado si se proporciona, o el nombre original del archivo
    const customName = req.body.instanceName || file.originalname;
    //si no tiene un nombre , mandamos un mensaje de error, porque el nombre del archivo es obligatorio para identificarlo luego, y no queremos que se llame "file.xlsx" o algo genérico
    if (!customName) {
      return cb(new Error('El nombre de la instancia es obligatorio para el archivo subido.'));
    }
    // 2. Limpiamos el nombre (opcional: quitar espacios o caracteres raros)
    const cleanName = customName.replace(/\s+/g, '_');

    // IMPORTANTE: Obtener eventId de params, no de body
    const eventId = req.params.eventId || 'unknown';
    // Mantener la extensión original (.xlsx, .csv, etc.)
    const ext = path.extname(file.originalname);
    
    cb(null, `${eventId}-${cleanName}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage: storage });

// --- Rutas de Instancias de Simulacro (solo MATRICULADOR) ---
// Ahora se vincula a un evento de simulacro
// Deprecated: solo crea instancia vacia; el frontend usa process-raw
router.post('/events/:eventId/instances', checkMatriculadorRole, upload.single('file'), simulationController.initiateSimulationUpload);
router.post('/events/:eventId/instances/process-raw', checkMatriculadorRole, upload.single('file'), simulationController.processRawSimulationResults);
router.post('/events/:eventId/instances/import-processed', checkMatriculadorRole, upload.single('file'), simulationController.importProcessedSimulationResults);


//router.post('/instances/:instanceId/upload-file', checkMatriculadorRole, upload.single('excelFile'), simulationController.uploadSimulationFile); // NUEVO ENDPOINT DE SUBIDA
router.post('/instances/:instanceId/actions/process', checkMatriculadorRole, simulationController.processSimulationResults);

// NUEVAS RUTAS PARA RESULTADOS DE SIMULACRO (solo MATRICULADOR)
router.get('/instances/:instanceId/results', checkMatriculadorRole, simulationController.getSimulationResults);
router.get('/instances/:instanceId/results/export', checkMatriculadorRole, simulationController.exportSimulationResults);
//nueva linea para eliminar un evento de simulacro, solo para admin y kami
router.delete('/events/:eventId', checkMatriculadorRole, simulationController.deleteEvent);
//nueva linea para eliminar una instancia de simulacro, solo para admin y kami
router.delete('/instances/:instanceId', checkMatriculadorRole, simulationController.deleteInstance);

// --- Rutas de búsqueda de estudiantes y estado académico ---
router.get('/students/search', checkMatriculadorRole, simulationController.searchStudents);
router.get('/students/:studentId/academic-status', checkMatriculadorRole, simulationController.getStudentAcademicStatus);

module.exports = router;
