const courseService = require('../services/courseModuleService');
const { getRoleName } = require('../middlewares/roleGuard');
const { createHttpError } = require('../utils/httpError');

const deleteCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    await courseService.deleteCourse(courseId);

    res.status(200).json({ message: 'Curso eliminado correctamente' });
  } catch (error) {
    next(error);
  }
};


const getCourses = async (req, res, next) => {
  try {
    const roleName = getRoleName(req.user);

    if (roleName === 'student') {
      const userModality = req.user?.studentProfile?.modality;

      if (!userModality) {
        throw createHttpError(
          404,
          'No se encontró la modalidad del estudiante. No es posible filtrar los cursos.'
        );
      }

      const courses = await courseService.getCoursesForStudent(userModality);
      return res.status(200).json(courses);
    }

    if (['admin', 'matriculador', 'kami', 'teacher'].includes(roleName)) {
      const courses = await courseService.getAllCourses();
      return res.status(200).json(courses);
    }

    throw createHttpError(403, 'Tu rol no tiene permiso para consultar cursos.');
  } catch (error) {
    next(error);
  }
};

const getCourseById = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const roleName = getRoleName(req.user);
    const course = await courseService.getCourseById(courseId);

    if (roleName === 'student') {
      await courseService.assertStudentCourseAccess(courseId, req.user.id);
    } else if (!['admin', 'matriculador', 'kami', 'teacher'].includes(roleName)) {
      throw createHttpError(403, 'Tu rol no tiene permiso para consultar el detalle del curso.');
    }

    res.status(200).json(course);
  } catch (error) {
    next(error);
  }
};

// const createCourse = async (req, res, next) => {
//   try {
//     const courseData = {
//       ...req.body,
//       // Si el frontend envió 'allowedModalities' como String (vía FormData), 
//       // debemos parsearlo a objeto JS
//       modalities: typeof req.body.allowedModalities === 'string' 
//         ? JSON.parse(req.body.allowedModalities) 
//         : req.body.allowedModalities
//     };

//     const newCourse = await courseService.createCourse(courseData);
//     res.status(201).json({
//       message: 'Curso creado exitosamente.',
//       course: newCourse,
//     });
//   } catch (error) {
//     next(error);
//   }
// };
// Localiza tu función createCourse en el controlador
const createCourse = async (req, res, next) => {
  try {
    const body = req.body || {};
    let modalities = [];
    if (body.allowedModalities) {
      modalities = typeof body.allowedModalities === 'string' 
        ? JSON.parse(body.allowedModalities) 
        : body.allowedModalities;
    }

    const courseData = {
      ...body,
      allowedModalities: modalities,
      imageUrl: req.file ? `/uploads/course-covers/${req.file.filename}` : body.imageUrl
    };

    const newCourse = await courseService.createCourse(courseData);

    return res.status(201).json(newCourse);
  } catch (error) {
    next(error);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;

    const courseData = {
      ...req.body,

      // 🔥 corregimos nombre consistente
      allowedModalities:
        typeof req.body.allowedModalities === 'string'
          ? JSON.parse(req.body.allowedModalities)
          : req.body.allowedModalities,

      // 🔥 AGREGAR imagen
      image: req.file || null,
    };

    const updatedCourse = await courseService.updateCourse(courseId, courseData);

    res.status(200).json({
      message: 'Curso actualizado exitosamente.',
      course: updatedCourse,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
};
