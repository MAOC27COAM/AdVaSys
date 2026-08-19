import api from './api';

export const gradeService = {
  getStudentSimulationResults: async () => {
    // El userId se obtiene en el backend desde el token JWT.
    const response = await api.get('/grades/me/simulation-results');
    return response.data;
  },
};
