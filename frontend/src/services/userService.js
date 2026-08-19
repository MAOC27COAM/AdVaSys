import api from './api';

export const userService = {
  getUsers: async (filters = {}) => {
    const response = await api.get('/users', { params: filters });
    return response.data;
  },

  getCycleFilters: async (cycleId) => {
    const response = await api.get('/users/cycle-filters', { params: { cycleId } });
    return response.data;
  },

  getAdminUsers: async (filters = {}) => {
    const response = await api.get('/users/admin-users', { params: filters });
    return response.data;
  },

  createAdminUser: async (userData) => {
    const response = await api.post('/users/create', userData);
    return response.data;
  },

  deactivateUser: async (userId) => {
    const response = await api.post(`/users/${userId}/deactivate`);
    return response.data;
  },
  

  updateUser: async (userId, userData) => {
    const response = await api.patch(`/users/${userId}`, userData);
    return response.data;
  },

  exportUsersToExcel: async (filters, columns) => {
    const response = await api.post('/users/export-excel', { filters, columns }, {
      responseType: 'blob',
    });
    return response.data;
  },

  generateCardSheet: async (cycleId, studentIds) => {
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
};
