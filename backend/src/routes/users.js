// backend/src/routes/users.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../../middlewares/authMiddleware');
// Importamos el nuevo controlador
const userController = require('../../controllers/userController');


// 🔐 Middleware de Autenticación Global para este router.
// Todas las rutas definidas en este archivo requerirán un token JWT válido.
router.use(authMiddleware);

// --- Rutas de Gestión de Usuarios (Refactorizadas) ---

// GET /api/users -> Listar y filtrar usuarios
// La lógica de filtrado se manejará en el controlador y servicio.
router.get('/', userController.checkRole, userController.getUsers);

// GET /api/users/cycle-filters -> Obtener modalidades y grupos disponibles en un ciclo
router.get('/cycle-filters', userController.checkRole, userController.getCycleFilters);

// PATCH /api/users/:userId -> Actualizar parcialmente un usuario
router.patch('/:userId', userController.checkRole, userController.updateUser);

// POST /api/users/export-pdf -> Exportar lista de usuarios a PDF
router.post('/export-pdf', userController.checkRole, userController.exportUsersToPdf);
router.post('/export-excel', userController.checkRole, userController.exportUsersToExcel);

// --- Rutas de Gestión de Usuarios Administrativos ---

// GET /api/users/admin-users -> Listar usuarios con rol admin, teacher o matriculador
router.get('/admin-users', userController.checkRole, userController.getAdminUsers);

// POST /api/users/create -> Crear un nuevo usuario administrativo (admin, teacher, matriculador)
router.post('/create', userController.checkRole, userController.createUser);

// POST /api/users/:userId/deactivate -> Dar de baja (status=RETIRED) a un usuario
router.post('/:userId/deactivate', userController.checkRole, userController.deactivateUser);

// NOTA: Los endpoints GET (uno), PUT y DELETE por ID han sido omitidos. 
// La funcionalidad de GET /:id se puede lograr con GET / y un filtro.
// La funcionalidad de PUT /:id se reemplaza con PATCH /:userId.
// La funcionalidad de DELETE /:id se puede añadir de nuevo si es un requerimiento.


// Exportación del router.
module.exports = router;
