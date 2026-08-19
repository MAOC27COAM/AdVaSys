const express = require('express');
const router = express.Router();
const multer = require('multer');
const backupController = require('../../controllers/backupController');
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { requireRoles } = require('../../middlewares/roleGuard');

const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);

router.get(
  '/export',
  requireRoles(['admin', 'kami']),
  backupController.exportDB
);

router.post(
  '/import',
  requireRoles(['admin', 'kami']),
  upload.single('file'),
  backupController.importDB
);

module.exports = router;
