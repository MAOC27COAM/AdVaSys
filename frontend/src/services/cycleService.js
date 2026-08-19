import api from './api';

export const cycleService = {
  getCycleById: async (cycleId) => {
    const response = await api.get(`/cycles/${cycleId}`);
    return response.data;
  },
};
