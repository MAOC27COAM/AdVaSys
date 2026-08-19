import api from './api';


export const studentService = { 
  /**
   * Actualiza los datos de un estudiante y su matrícula.
    
   */
  updateStudent: async (id, data) => {
    // Usamos 'api' en lugar de 'axios'
    // La URL es relativa porque 'api' ya tiene la baseURL
    const response = await api.put(`/students/${id}`, data);
    return response.data;
  },
// Nuevo método para obtener estudiantes matriculados con filtros (ej. ciclo, búsqueda, etc.)-> NO A
  getstudentMatriculados: async (filters = {}) => {
    const response = await api.get('/students', { params: filters });
    return response.data;
  },
  // MATRICULA DE NUEVO ESTUDIANTE-> RECOMENDABLE USAR ESTE METODO:
  enrollStudent: async (data) => {
    // Nuevamente, simplificamos usando la instancia 'api'
    const response = await api.post('/students/enrollment', data);
    return response.data;
  },
  // Nuevo método para búsqueda de estudiantes matriculados con filtros
  buquedaMatriculados: async (filters = {}) => {
    const response = await api.get('/students/search', { params: filters });
    return response.data;
  },
  //NUEVO METODO PARA LA PETITCION DE LA INFORMACION DE TODOS LOS DATOS DEL ESTUDIANTE, INCLUYENDO SU MATRICULA, CICLO, CURSO, PARALELO, ETC.
    getStudentById: async (id, cycleId = null) => {
      const response = await api.get(`/students/${id}`, {
        params: cycleId ? { cycleId } : undefined,
      });
      return response.data;
    },
    generateAcademicCard: async (id, cycleId) => {
      const response = await api.get(`/students/${id}/academic-card`, {
        params: { cycleId },
        responseType: 'blob',
      });

      const contentDisposition = response.headers['content-disposition'] || '';
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);

      return {
        blob: response.data,
        filename: filenameMatch?.[1] || `carnet-${id}.pdf`,
      };
    },
    generateAcademicCardSheet: async (cycleId, studentIds) => {
      const response = await api.post('/students/academic-cards/print-sheet', {
        cycleId,
        studentIds,
      }, {
        responseType: 'blob',
      });

      const contentDisposition = response.headers['content-disposition'] || '';
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);

      return {
        blob: response.data,
        filename: filenameMatch?.[1] || `plancha-carnets-${cycleId}.pdf`,
      };
    },
    previewBulkEnrollment: async (cycleId, file) => {
      const formData = new FormData();
      formData.append('cycleId', cycleId);
      formData.append('file', file);

      const response = await api.post('/students/bulk-enrollment/preview', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    },
    commitBulkEnrollment: async (cycleId, rows) => {
      const response = await api.post('/students/bulk-enrollment/commit', {
        cycleId,
        rows,
      });

      return response.data;
    },
    uploadProfileImage: async (file) => {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await api.post('/students/profile-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    }
};
