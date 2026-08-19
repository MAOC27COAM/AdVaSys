const express = require('express');
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { requireRoles } = require('../../middlewares/roleGuard');
const materialController = require('../../controllers/materialModuleController');

const router = express.Router();

router.use(authMiddleware);

const requireMaterialManager = requireRoles(['admin', 'matriculador', 'kami', 'teacher'], {
  forbiddenMessage:
    'Solo administradores, matriculadores, Kami o docentes pueden editar la información de materiales.',
});

router.patch('/:fileId', requireMaterialManager, materialController.updateMaterialMetadata);
router.delete('/:fileId', requireMaterialManager, materialController.deleteMaterial);
router.get('/:fileId/access-url', materialController.getMaterialAccessUrl);
router.get('/:fileId/file', materialController.streamMaterialFile);

module.exports = router;
