import api from './api';

export const simulationService = {
  createAcademicModality: async (modalityData) => {
    const response = await api.post('/simulations/academic-modalities', modalityData);
    return response.data;
  },

  getAcademicModalities: async () => {
    const response = await api.get('/simulations/academic-modalities');
    return response.data;
  },

  createSimulationEvent: async (eventData) => {
    const response = await api.post('/simulations/events', eventData);
    return response.data;
  },

  getSimulationEvents: async (cycleId) => {
    const response = await api.get('/simulations/events', {
      params: { cycleId },
    });
    return response.data;
  },

  getSimulationEventsByModality: async (modalityId) => {
    const response = await api.get(`/simulations/academic-modalities/${modalityId}/events`);
    return response.data;
  },

  saveEventAnswerKey: async (eventId, answerKey) => {
    const response = await api.put(`/simulations/events/${eventId}/answer-key`, { answerKey });
    return response.data;
  },

  getSimulationInstancesByEvent: async (eventId, cycleId) => {
    const response = await api.get(`/simulations/events/${eventId}/instances`, {
      params: { cycleId },
    });
    return response.data;
  },

  initiateSimulationUpload: async (eventId, formData) => {
    const response = await api.post(`/simulations/events/${eventId}/instances`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  processRawSimulationResults: async (eventId, formData) => {
    const response = await api.post(`/simulations/events/${eventId}/instances/process-raw`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  importProcessedSimulationResults: async (eventId, formData) => {
    const response = await api.post(`/simulations/events/${eventId}/instances/import-processed`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  validateStudentCodes: async (studentCodes, cycleId) => {
    const response = await api.post('/simulations/validate-codes', {
      codes: studentCodes,
      cycleId,
    });
    return response.data;
  },

  validateSimulationInstance: async (instanceId) => {
    const response = await api.post(`/simulations/instances/${instanceId}/actions/validate`);
    return response.data;
  },

  getValidationPreview: async (instanceId) => {
    const response = await api.get(`/simulations/instances/${instanceId}/validation-preview`);
    return response.data;
  },

  processSimulationResults: async (instanceId, cycleId) => {
    const response = await api.post(`/simulations/instances/${instanceId}/actions/process`, { cycleId });
    return response.data;
  },

  getSimulationResults: async (instanceId, cycleId) => {
    const response = await api.get(`/simulations/instances/${instanceId}/results`, {
      params: { cycleId },
    });
    return response.data;
  },

  exportSimulationResults: async (instanceId, cycleId) => {
    const response = await api.get(`/simulations/instances/${instanceId}/results/export`, {
      params: { cycleId },
      responseType: 'blob',
    });
    return response.data;
  },

  deleteSimulationEvent: async (eventId) => {
    const response = await api.delete(`/simulations/events/${eventId}`);
    return response.data;
  },

  deleteSimulationInstance: async (instanceId) => {
    const response = await api.delete(`/simulations/instances/${instanceId}`);
    return response.data;
  },

  searchStudents: async (q, cycleId) => {
    const response = await api.get('/simulations/students/search', {
      params: { q, cycleId },
    });
    return response.data;
  },

  getStudentAcademicStatus: async (studentId, cycleId) => {
    const response = await api.get(`/simulations/students/${studentId}/academic-status`, {
      params: { cycleId },
    });
    return response.data;
  },
};
