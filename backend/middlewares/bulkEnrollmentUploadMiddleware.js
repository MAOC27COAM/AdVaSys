const multer = require('multer');
const { createHttpError } = require('../utils/httpError');

const allowedMimeTypes = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
]);

const uploadBulkEnrollmentFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const extension = (file.originalname || '').toLowerCase();
    const isExcelName = extension.endsWith('.xlsx') || extension.endsWith('.xls');

    if (!isExcelName && !allowedMimeTypes.has(file.mimetype)) {
      return cb(
        createHttpError(
          400,
          'El archivo debe ser un Excel valido (.xlsx o .xls).'
        )
      );
    }

    return cb(null, true);
  },
});

module.exports = {
  uploadBulkEnrollmentFile,
};
