import api from './api';

export const courseService = {
  getAllCourses: async () => {
    const response = await api.get('/courses');
    return response.data;
  },

  getCourseById: async (courseId) => {
    const response = await api.get(`/courses/${courseId}`);
    return response.data;
  },

  createCourse: async (courseData) => {
    const response = await api.post('/courses', courseData);
    return response.data;
  },

  updateCourse: async (courseId, courseData) => {
    const response = await api.patch(`/courses/${courseId}`, courseData);
    return response.data;
  },

  deleteCourse: async (courseId) => {
    const response = await api.delete(`/courses/${courseId}`);
    return response.data;
  },

  getCourseMaterials: async (courseId) => {
    const response = await api.get(`/courses/${courseId}/materials`);
    return response.data;
  },

  uploadMaterial: async (courseId, formData) => {
    const response = await api.post(`/courses/${courseId}/materials`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteMaterial: async (fileId) => {
    const response = await api.delete(`/materials/${fileId}`);
    return response.data;
  },

  getMaterialBinary: async (fileId) => {
    const response = await api.get(`/materials/${fileId}/file`, {
      responseType: 'arraybuffer',
    });
    return response.data;
  },
};