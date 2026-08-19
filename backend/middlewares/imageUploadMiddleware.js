const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { createHttpError } = require('../utils/httpError');

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const sanitizeFileName = (fileName, fallback = 'image') =>
  path
    .basename(fileName, path.extname(fileName))
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || fallback;

const createImageUpload = ({ targetDir, fileSizeLimitMb, fallbackName }) => {
  const absoluteTargetDir = path.join(__dirname, '..', 'uploads', targetDir);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        fs.mkdirSync(absoluteTargetDir, { recursive: true });
        cb(null, absoluteTargetDir);
      } catch (error) {
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      const safeName = sanitizeFileName(file.originalname, fallbackName);
      const extension = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${safeName}${extension}`);
    },
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: fileSizeLimitMb * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
        return cb(
          createHttpError(
            400,
            'El tipo de archivo no esta permitido. Solo se aceptan imagenes JPG, PNG y WEBP.'
          )
        );
      }

      return cb(null, true);
    },
  });

  return (fieldName) => (req, res, next) => {
    upload.single(fieldName)(req, res, (error) => {
      if (error?.name === 'MulterError' && error.code === 'LIMIT_FILE_SIZE') {
        return next(
          createHttpError(400, `El archivo excede el tamano maximo permitido de ${fileSizeLimitMb} MB.`)
        );
      }

      return next(error);
    });
  };
};

const uploadStudentProfileImage = createImageUpload({
  targetDir: path.join('profile-pictures'),
  fileSizeLimitMb: 1,
  fallbackName: 'profile',
});

const uploadCourseCoverImage = createImageUpload({
  targetDir: path.join('course-covers'),
  fileSizeLimitMb: 4,
  fallbackName: 'course-cover',
});

module.exports = {
  uploadStudentProfileImage,
  uploadCourseCoverImage,
};
