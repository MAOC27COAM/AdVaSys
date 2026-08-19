const express = require('express');
const { authMiddleware } = require('../../middlewares/authMiddleware');
const { requireRoles } = require('../../middlewares/roleGuard');
const { uploadMaterialFile } = require('../../middlewares/materialUploadMiddleware');
const { uploadCourseCoverImage } = require('../../middlewares/imageUploadMiddleware');
const courseController = require('../../controllers/courseModuleController');
const materialController = require('../../controllers/materialModuleController');

const router = express.Router();

router.use(authMiddleware);

const requireCourseManager = requireRoles(['admin', 'matriculador', 'kami', 'teacher'], {
  forbiddenMessage:
    'Solo administradores, matriculadores, Kami o docentes pueden gestionar cursos y materiales.',
});

router.get('/', courseController.getCourses);
router.get('/:courseId', courseController.getCourseById);
router.post('/', requireCourseManager, uploadCourseCoverImage('image'), courseController.createCourse);
router.patch('/:courseId', requireCourseManager, uploadCourseCoverImage('image'), courseController.updateCourse);
router.delete('/:courseId', requireCourseManager, courseController.deleteCourse);

router.get('/:courseId/materials', materialController.getCourseMaterials);
router.post(
  '/:courseId/materials',
  requireCourseManager,
  uploadMaterialFile.single('file'),
  materialController.uploadMaterial
);

module.exports = router;
