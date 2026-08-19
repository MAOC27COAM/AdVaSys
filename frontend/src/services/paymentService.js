import api from './api';

export const paymentService = {
  getCycleSummary: async (cycleId) => {
    const response = await api.get('/payments/cycle-summary', {
      params: { cycleId },
    });
    return response.data;
  },

  getCycleHistory: async (cycleId) => {
    const response = await api.get('/payments/cycle-history', {
      params: { cycleId },
    });
    return response.data;
  },

  searchStudents: async (cycleId, q) => {
    const response = await api.get('/payments/search', {
      params: { cycleId, q },
    });
    return response.data;
  },

  getStudentSummary: async (documentId, cycleId) => {
    const response = await api.get('/payments/student-summary', {
      params: { documentId, cycleId },
    });
    return response.data;
  },

  getPaymentHistory: async (documentId, cycleId) => {
    const response = await api.get('/payments/history', {
      params: { documentId, cycleId },
    });
    return response.data;
  },

  registerPayment: async (payload) => {
    const response = await api.post('/payments/register', payload);
    return response.data;
  },

  registerDiscount: async (payload) => {
    const response = await api.post('/payments/discount', payload);
    return response.data;
  },

  retireStudent: async (userId, payload = {}) => {
    const response = await api.post(`/payments/student/${userId}/retire`, payload);
    return response.data;
  },

  activateStudent: async (userId, payload = {}) => {
    const response = await api.post(`/payments/student/${userId}/activate`, payload);
    return response.data;
  },
};
