// Importaciones de React y hooks.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Hook para la navegación programática.
import { useAuth } from '../context/AuthContext'; // Hook personalizado para acceder al contexto de autenticación.
import styles from './Login.module.css'; // Estilos CSS específicos para este componente.

/**
 * Componente Login: Permite a los usuarios autenticarse en la aplicación.
 * Gestiona el estado de los inputs, errores y la lógica de inicio de sesión.
 */
function Login() {
  // --- Bloque de Declaración de Estados ---
  // Guarda el nombre de usuario ingresado en el input.
  const [username, setUsername] = useState('');
  // Guarda la contraseña ingresada en el input.
  const [password, setPassword] = useState('');
  // Almacena mensajes de error relacionados con el login.
  const [error, setError] = useState('');
  
  // --- Bloque de Hooks ---
  // Hook de react-router-dom para redirigir al usuario después del login.
  const navigate = useNavigate();
  // `login` es la función para autenticar y `isLoading` indica si la autenticación está en progreso.
  const { login, isLoading, authError, clearAuthError } = useAuth();

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  // --- Manejador de Eventos ---
  /**
   * Maneja el envío del formulario de login.
   * Previene el comportamiento por defecto del formulario, intenta autenticar al usuario
   * y redirige al dashboard en caso de éxito, o muestra un error en caso contrario.
   * @param {Event} e - El evento de envío del formulario.
   */
  const handleSubmit = async (e) => {
    e.preventDefault(); // Evita que la página se recargue.
    setError(''); // Limpia cualquier error previo.
    clearAuthError();
    try {
      await login(username, password); // Llama a la función de login del contexto de autenticación.
      navigate('/dashboard'); // Redirige al dashboard en caso de éxito.
    } catch (err) {
      // Captura y muestra mensajes de error de la API o del proceso de login.
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    }
  };

  // --- Renderizado del Componente ---
  return (
    <div className={styles.loginPage}> {/* Contenedor principal de la página de login */}
      <div className={styles.wrapper}> {/* Contenedor para centrar y estilizar el formulario */}
        <div className={styles.formBox}> {/* Caja que contiene el formulario */}
          <h2>Aduni Vallejo</h2> {/* Título de la aplicación o módulo */}
          <form onSubmit={handleSubmit}> {/* Formulario de login */}
            {error && ( /* Muestra un mensaje de error si existe */
              <div className={styles.errorMessage}>{error}</div>
            )}
            
            {/* Campo de entrada para el nombre de usuario */}
            <div className={styles.inputBox}>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <label htmlFor="username">Nombre de usuario</label>
            </div>

            {/* Campo de entrada para la contraseña */}
            <div className={styles.inputBox}>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <label htmlFor="password">Contraseña</label>
            </div>

            {/* Botón de envío del formulario */}
            <button 
              type="submit" 
              className={`${styles.btn} ${isLoading ? styles.loading : ''}`}
              disabled={isLoading} // Deshabilita el botón mientras se está cargando (autenticando)
            >
              {isLoading ? 'Entrando...' : 'Entrar'} {/* Texto del botón cambia según el estado de carga */}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
export default Login;
