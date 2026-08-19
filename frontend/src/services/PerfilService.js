import api from './api';

export const PerfilService = {
  getStudentById: async (id) => {
      const response = await api.get(`/Perfil/${id}`);
      return response.data;
    }
};
