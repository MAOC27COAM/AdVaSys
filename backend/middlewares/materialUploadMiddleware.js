const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { createHttpError } = require('../utils/httpError');

const uploadsRoot = path.join(__dirname, '..', 'uploads', 'courses');

const sanitizeFileName = (fileName) =>
  path
    .basename(fileName, path.extname(fileName))
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'material';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const courseId = String(req.params.courseId || '').trim();
      const targetDir = path.join(uploadsRoot, courseId);
      fs.mkdirSync(targetDir, { recursive: true });
      cb(null, targetDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const safeName = sanitizeFileName(file.originalname);
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${safeName}${extension}`);
  },
});

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
]);

const uploadMaterialFile = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(
        createHttpError(
          400,
          'El tipo de archivo no está permitido. Solo se aceptan PDF, Office, imágenes y texto.'
        )
      );
    }

    return cb(null, true);
  },
});

module.exports = {
  uploadMaterialFile,
  uploadsRoot,
};
