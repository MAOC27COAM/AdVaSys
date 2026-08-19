const fs = require('fs');
const path = require('path');
const prisma = require('../utils/prismaClient');
const { createHttpError } = require('../utils/httpError');
const { getRoleName } = require('../middlewares/roleGuard');
const courseService = require('./courseModuleService');

const parseFileId = (fileId) => {
  const parsedId = parseInt(fileId, 10);
  if (Number.isNaN(parsedId)) {
    throw createHttpError(400, 'El identificador del material no es válido.');
  }
  return parsedId;
};

const fileInclude = {
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  course: {
    select: {
      id: true,
      title: true,
    },
  },
};

const ensureMaterialExists = async (fileId) => {
  const id = parseFileId(fileId);
  const file = await prisma.file.findUnique({
    where: { id },
    include: fileInclude,
  });

  if (!file) {
    throw createHttpError(404, 'No se encontró el material solicitado.');
  }

  return file;
};

const ensureMaterialIsAvailableOnDisk = (file) => {
  const relativePath = String(file.path || '').replace(/^\/+/, '');
  const absolutePath = path.join(__dirname, '..', relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw createHttpError(
      404,
      'El archivo fue registrado, pero no se encuentra disponible en el almacenamiento local.'
    );
  }
};

const resolveMaterialAbsolutePath = (file) => {
  const relativePath = String(file.path || '').replace(/^\/+/, '');
  return path.join(__dirname, '..', relativePath);
};

module.exports = {
  createMaterialForCourse: async ({ courseId, userId, file, description, resource }) => {
    const course = await courseService.getCourseById(courseId);

    if (!file) {
      throw createHttpError(400, 'Debes adjuntar un archivo en el campo "file".');
    }

    const relativePath = path
      .join('uploads', 'courses', String(course.id), file.filename)
      .replace(/\\/g, '/');

    const material = await prisma.file.create({
      data: {
        name: file.originalname,
        path: `/${relativePath}`,
        mimeType: file.mimetype,
        size: file.size,
        description: description ? String(description).trim() : null,
        resource: resource ? String(resource).trim() : null,
        uploadedBy: userId,
        courseId: course.id,
      },
      include: fileInclude,
    });

    return material;
  },

  updateFileMetadata: async (fileId, data) => {
    const id = parseFileId(fileId);
    const payload = {};

    if (data.description !== undefined) {
      payload.description = data.description ? String(data.description).trim() : null;
    }

    if (data.resource !== undefined) {
      payload.resource = data.resource ? String(data.resource).trim() : null;
    }

    if (data.name !== undefined) {
      payload.name = String(data.name).trim();
    }

    if (Object.keys(payload).length === 0) {
      throw createHttpError(400, 'Debes enviar al menos un campo editable del material.');
    }

    try {
      return await prisma.file.update({
        where: { id },
        data: payload,
        include: fileInclude,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw createHttpError(404, 'No se encontró el material que intentas actualizar.');
      }
      throw error;
    }
  },

  getFilesByCourse: async (courseId) => {
    const course = await courseService.getCourseById(courseId);

    const materials = await prisma.file.findMany({
      where: { courseId: course.id },
      orderBy: { uploadedAt: 'desc' },
      include: fileInclude,
    });

    return {
      course: {
        id: course.id,
        title: course.title,
      },
      materials,
    };
  },

  getMaterialAccessData: async (fileId, user) => {
    const roleName = getRoleName(user);
    const file = await ensureMaterialExists(fileId);
    ensureMaterialIsAvailableOnDisk(file);

    if (roleName === 'student') {
      await courseService.assertStudentCourseAccess(file.course.id, user.id);
    } else if (!['matriculador', 'admin', 'kami', 'teacher'].includes(roleName)) {
      throw createHttpError(403, 'Tu rol no tiene permiso para consultar este material.');
    }

    return {
      fileId: file.id,
      fileName: file.name,
      mimeType: file.mimeType,
      size: file.size,
      courseId: file.course.id,
      courseTitle: file.course.title,
    };
  },

  streamMaterialFile: async (fileId, user) => {
    const roleName = getRoleName(user);
    const file = await ensureMaterialExists(fileId);
    ensureMaterialIsAvailableOnDisk(file);

    if (roleName === 'student') {
      await courseService.assertStudentCourseAccess(file.course.id, user.id);
    } else if (!['matriculador', 'admin', 'kami', 'teacher'].includes(roleName)) {
      throw createHttpError(403, 'Tu rol no tiene permiso para consultar este material.');
    }

    return {
      file,
      absolutePath: resolveMaterialAbsolutePath(file),
    };
  },

  deleteMaterial: async (fileId) => {
    const file = await ensureMaterialExists(fileId);
    const absolutePath = resolveMaterialAbsolutePath(file);

    await prisma.file.delete({
      where: { id: file.id },
    });

    try {
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn('[MaterialDeleteWarning] No se pudo borrar el archivo fisico:', error.message);
      }
    }

    return {
      id: file.id,
      name: file.name,
    };
  },
};
