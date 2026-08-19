import api from './api';

export const scheduleService = {
  createSchedule: async (scheduleData) => {
    const response = await api.post('/schedules', scheduleData);
    return response.data;
  },

  getSchedules: async () => {
    const response = await api.get('/schedules');
    return response.data;
  },

  getScheduleById: async (scheduleId) => {
    const response = await api.get(`/schedules/${scheduleId}`);
    return response.data;
  },

  exportScheduleToPdf: async (scheduleId) => {
    const response = await api.get(`/schedules/${scheduleId}/export-pdf`, {
      responseType: 'blob', // Importante para recibir archivos binarios
    });
    return response.data;
  },
};
