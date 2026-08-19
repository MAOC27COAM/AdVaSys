import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// Definir la URL de la API (se puede centralizar más tarde en un archivo de configuración/servicio)
const API_URL = process.env.REACT_APP_API_URL || '/api';

// Crear el contexto de autenticación
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // Configurar interceptor de Axios para adjuntar el token automáticamente
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Función para obtener la información del usuario desde el backend
  const fetchUser = async (authToken) => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setUser(response.data);
      setAuthError('');
      return response.data;
    } catch (error) {
      console.error("Error al obtener los datos del usuario:", error);
      // Si falla, limpiar el token y cerrar sesión
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setAuthError(error.response?.data?.message || 'Tu sesión ya no está disponible. Inicia sesión nuevamente.');
      return null;
    }
  };

  // Efecto para cargar el usuario al iniciar la aplicación si hay un token
  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        await fetchUser(token);
      }
      setIsLoading(false);
    };
    initializeAuth();
  }, [token]); // Se ejecuta cuando el token cambia (al iniciar o al loguearse/desloguearse)

  const login = async (username, password) => {
    setIsLoading(true);
    setAuthError('');
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { username, password });
      const newToken = response.data.token;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      await fetchUser(newToken); // Obtener info del usuario inmediatamente después del login
      return true;
    } catch (error) {
      console.error("Error en el login:", error);
      throw error; // Re-lanzar el error para que el componente de Login lo maneje
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const clearAuthError = () => {
    setAuthError('');
  };

  const authContextValue = {
    user,
    token,
    isLoading,
    authError,
    login,
    logout,
    clearAuthError,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook para usar el contexto de autenticación fácilmente
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
