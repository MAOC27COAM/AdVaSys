import api from './api';

export const pivotService = {
  getPivotData: async (params = {}) => {
    const response = await api.get('/pivot/data', { params });
    return response.data;
  }
};
