const express = require('express');
const router = express.Router();
const PerfilController = require('../../controllers/PerfilController');
const { authMiddleware } = require('../../middlewares/authMiddleware');

/**
 * RUTA: GET /api/perfil/:id
 * DESCRIPCIÓN: Extrae datos personales, matrícula, ciclo y cursos del estudiante.
 * PROTECCIÓN: 
 * 1. Debe estar autenticado (authMiddleware).
 * 2. Solo puede acceder el propio estudiante o roles administrativos (kami, admin).
 */
router.get('/:id', authMiddleware, // Verifica que el token sea válido y setea req.user
PerfilController.getStudentById
);

module.exports = router;