import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adjuntar el token de autenticación a cada solicitud
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Obtener el token del localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta (ej. token expirado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Aquí se puede añadir lógica para, por ejemplo, redirigir al login si el token expira (401)
    if (error.response && error.response.status === 401) {
      // Opcional: limpiar token y redirigir al login. 
      // En este caso, el AuthContext ya maneja la limpieza si la llamada a /auth/me falla.
      console.log("Token expirado o no autorizado. El AuthContext debería manejar esto.");
    }
    return Promise.reject(error);
  }
);

export default api;
