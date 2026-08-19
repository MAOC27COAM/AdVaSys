const fs = require('fs');
const materialService = require('../services/materialModuleService');
const courseService = require('../services/courseModuleService');
const { getRoleName } = require('../middlewares/roleGuard');
const { createHttpError } = require('../utils/httpError');

const uploadMaterial = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const material = await materialService.createMaterialForCourse({
      courseId,
      userId: req.user.id,
      file: req.file,
      description: req.body.description,
      resource: req.body.resource,
    });

    res.status(201).json({
      message: 'Material subido correctamente al almacenamiento local.',
      material,
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

const getCourseMaterials = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const roleName = getRoleName(req.user);

    if (roleName === 'student') {
      await courseService.assertStudentCourseAccess(courseId, req.user.id);
    } else if (!['admin', 'matriculador', 'kami', 'teacher'].includes(roleName)) {
      throw createHttpError(403, 'Tu rol no tiene permiso para consultar materiales de cursos.');
    }

    const materials = await materialService.getFilesByCourse(courseId);
    res.status(200).json(materials);
  } catch (error) {
    next(error);
  }
};

const updateMaterialMetadata = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const updatedFile = await materialService.updateFileMetadata(fileId, req.body);
    res.status(200).json({
      message: 'La información del material fue actualizada correctamente.',
      file: updatedFile,
    });
  } catch (error) {
    next(error);
  }
};

const getMaterialAccessUrl = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const data = await materialService.getMaterialAccessData(fileId, req.user);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
};

const streamMaterialFile = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const { file, absolutePath } = await materialService.streamMaterialFile(fileId, req.user);

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.name)}"`);
    res.sendFile(absolutePath);
  } catch (error) {
    next(error);
  }
};

const deleteMaterial = async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const material = await materialService.deleteMaterial(fileId);
    res.status(200).json({
      message: 'Material eliminado correctamente.',
      material,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadMaterial,
  getCourseMaterials,
  updateMaterialMetadata,
  getMaterialAccessUrl,
  streamMaterialFile,
  deleteMaterial,
};
