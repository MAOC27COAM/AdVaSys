import api from './api';

export const backupService = {
  exportDatabase: async () => {
    const response = await api.get('/system/backup/export', {
      responseType: 'blob',
    });
    return response.data;
  },

  importDatabase: async (file, skipDuplicates) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('skipDuplicates', skipDuplicates);
    const response = await api.post('/system/backup/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
