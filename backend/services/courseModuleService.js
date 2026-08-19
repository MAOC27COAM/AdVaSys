const fs = require('fs');
const path = require('path');
const prisma = require('../utils/prismaClient');
const { createHttpError } = require('../utils/httpError');

const normalizeModalities = (courseData = {}) => {
  const source = courseData.modalities ?? courseData.allowedModalities ?? [];
  const normalized = Array.isArray(source)
    ? source
        .map((modality) =>
          typeof modality === 'string'
            ? modality.trim()
            : String(modality?.modality || '').trim()
        )
        .filter(Boolean)
    : [];

  return [...new Set(normalized)];
};

const parseCourseId = (courseId) => {
  const parsedId = parseInt(courseId, 10);
  if (Number.isNaN(parsedId)) {
    throw createHttpError(400, 'El identificador del curso no es válido.');
  }
  return parsedId;
};

const courseBaseInclude = {
  allowedModalities: true,
  materials: {
    select: {
      id: true,
      name: true,
      path: true,
      mimeType: true,
      uploadedAt: true,
    },
  },
  _count: {
    select: {
      materials: true,
      classSessions: true,
    },
  },
};

const buildCoursePayload = (courseData = {}, { isUpdate = false } = {}) => {
  const { code, title, description, imageUrl } = courseData;
  const modalities = normalizeModalities(courseData);
  const payload = {};

  if (!isUpdate && !title) {
    throw createHttpError(400, 'El nombre del curso es obligatorio.');
  }

  if (!isUpdate && modalities.length === 0) {
    throw createHttpError(400, 'Debes asignar al menos una modalidad permitida al curso.');
  }

  if (title !== undefined) payload.title = String(title).trim();
  if (description !== undefined) payload.description = description ? String(description).trim() : null;
  if (imageUrl !== undefined) payload.imageUrl = imageUrl ? String(imageUrl).trim() : null;

  if (!isUpdate) {
    payload.code = code ? String(code).trim() : `CUR-${Date.now()}`;
  } else if (code !== undefined) {
    payload.code = String(code).trim();
  }

  if (modalities.length > 0 || courseData.modalities !== undefined || courseData.allowedModalities !== undefined) {
  payload.allowedModalities = {
    // Si es una actualización, borramos las anteriores. 
    // Si es creación, NO incluimos deleteMany.
    ...(isUpdate ? { deleteMany: {} } : {}), 
    create: modalities.map((modality) => ({ modality })),
  }
  }

  return payload;
};

const ensureCourseExists = async (courseId) => {
  const id = parseCourseId(courseId);
  const course = await prisma.course.findUnique({
    where: { id },
    include: courseBaseInclude,
  });

  if (!course) {
    throw createHttpError(404, 'No se encontró el curso solicitado.');
  }

  return course;
};

const removeCoverFile = (imageUrl) => {
  try {
    const relativePath = String(imageUrl || '').replace(/^\/+/, '');
    const absolutePath = path.join(__dirname, '..', relativePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch (error) {
    console.warn('[CourseCoverCleanup] No se pudo borrar la portada anterior:', error.message);
  }
};

const getStudentCourseAccessContext = async (courseId, userId) => {
  const id = parseCourseId(courseId);
  const numericUserId = parseInt(userId, 10);

  const [studentProfile, course] = await Promise.all([
    prisma.studentProfile.findUnique({
      where: { userId: numericUserId },
      select: {
        modality: true,
        user: {
          select: {
            cycleEnrollments: {
              select: { id: true },
            },
          },
        },
      },
    }),
    prisma.course.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        allowedModalities: {
          select: { modality: true },
        },
      },
    }),
  ]);

  if (!course) {
    throw createHttpError(404, 'No se encontró el curso solicitado.');
  }

  if (!studentProfile) {
    throw createHttpError(403, 'Tu perfil Academico no está configurado. No es posible validar acceso al curso.');
  }

  if (!studentProfile.user.cycleEnrollments.length) {
    throw createHttpError(403, 'No tienes una matrícula activa para acceder a este curso.');
  }

  const allowedModalities = course.allowedModalities.map((item) => item.modality);
  const hasAccess = allowedModalities.includes(studentProfile.modality);

  return {
    course,
    hasAccess,
  };
};

module.exports = {
  createCourse: async (courseData) => {
    const payload = buildCoursePayload(courseData);
    try {
      return await prisma.course.create({
        data: payload,
        include: courseBaseInclude,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw createHttpError(409, 'Ya existe un curso con ese código. Usa otro código o déjalo vacío para generarlo automáticamente.');
      }
      throw error;
    }
  },

  updateCourse: async (courseId, courseData) => {
    const id = parseCourseId(courseId);

    const existing = await prisma.course.findUnique({
      where: { id },
      select: { imageUrl: true },
    });

    const payload = buildCoursePayload(courseData, { isUpdate: true });

    if (Object.keys(payload).length === 0) {
      throw createHttpError(400, 'No se recibieron cambios para actualizar el curso.');
    }
    if (courseData.image) {
      payload.imageUrl = `/uploads/course-covers/${courseData.image.filename}`;
    }

    let updated;
    try {
      updated = await prisma.course.update({
        where: { id },
        data: payload,
        include: courseBaseInclude,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw createHttpError(404, 'No se encontró el curso que intentas actualizar.');
      }
      if (error.code === 'P2002') {
        throw createHttpError(409, 'El código ingresado ya pertenece a otro curso.');
      }
      throw error;
    }

    const oldImageUrl = existing?.imageUrl;
    if (oldImageUrl && oldImageUrl !== updated.imageUrl) {
      removeCoverFile(oldImageUrl);
    }

    return updated;
  },

  getCourseById: async (courseId) => ensureCourseExists(courseId),

  getAllCourses: async () => {
    const courses = await prisma.course.findMany({
      include: courseBaseInclude,
      orderBy: { title: 'asc' },
    });
    return courses.map((course) => ({
      ...course,
      materialCount: course._count.materials,
    }));
  },

  getCoursesForStudent: async (modality) => {
    const courses = await prisma.course.findMany({
      where: {
        allowedModalities: {
          some: { modality },
        },
      },
      include: courseBaseInclude,
      orderBy: { title: 'asc' },
    });
    return courses.map((course) => ({
      ...course,
      materialCount: course._count.materials,
    }));
  },
  deleteCourse: async (courseId) => {
    const id = parseCourseId(courseId);

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        materials: { select: { path: true } },
      },
    });

    if (!course) {
      throw createHttpError(404, 'No se encontró el curso solicitado.');
    }

    await prisma.course.delete({ where: { id } });

    const filesToRemove = (course.materials || [])
      .map((material) => material.path)
      .concat(course.imageUrl ? [course.imageUrl] : [])
      .filter(Boolean);

    filesToRemove.forEach((filePath) => {
      try {
        const relativePath = String(filePath).replace(/^\/+/, '');
        const absolutePath = path.join(__dirname, '..', relativePath);
        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      } catch (error) {
        console.warn('[CourseCleanup] No se pudo borrar el archivo:', error.message);
      }
    });

    try {
      const courseDir = path.join(__dirname, '..', 'uploads', 'courses', String(id));
      if (fs.existsSync(courseDir)) {
        fs.rmdirSync(courseDir);
      }
    } catch (error) {
      // No crítico: la carpeta puede contener archivos no borrados.
    }
  },
  checkStudentCourseAccess: async (courseId, userId) => {
    const context = await getStudentCourseAccessContext(courseId, userId);
    return context.hasAccess;
  },

  assertStudentCourseAccess: async (courseId, userId) => {
    const context = await getStudentCourseAccessContext(courseId, userId);

    if (!context.hasAccess) {
      throw createHttpError(
        403,
        'Este curso no está habilitado para la modalidad académica del estudiante.'
      );
    }

    return context.course;
  },
};
