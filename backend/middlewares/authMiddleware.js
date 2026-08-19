// Importación de módulos y dependencias.
const jwt = require('jsonwebtoken'); // Librería para verificar JSON Web Tokens.
const prisma = require('../utils/prismaClient'); // Cliente de Prisma para interactuar con la base de datos.
const { config } = require('../utils/config'); // Archivo de configuración (contiene el secreto del JWT).

// Middleware de autenticación.
// Esta función se encarga de verificar la validez de un token JWT en las peticiones entrantes.
const authMiddleware = async (req, res, next) => {
  // Se obtiene el encabezado de autorización de la petición.
  const authHeader = req.headers.authorization;

  // 1. Verificación de la existencia y formato del token.
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Acceso denegado. Token de autenticación requerido.' });
  }

  // Se extrae el token JWT del encabezado.
  const token = authHeader.split(' ')[1];

  try {
    // 2. Verificación y decodificación del token.
    // Se usa la clave secreta para verificar la autenticidad del token.
    const decoded = jwt.verify(token, config.jwtSecret);

    // 3. Búsqueda del usuario en la base de datos usando el ID decodificado del token.
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { 
        role: true, // Incluir la información del rol
        studentProfile: true, // Incluir el perfil de estudiante
      },
    });

    // 4. Verificación de la existencia del usuario.
    if (!user) {
      return res.status(401).json({ message: 'Usuario asociado al token no encontrado.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Usuario inactivo. Su sesión fue deshabilitada.' });
    }

    // 5. Forzar cambio de contraseña si mustChangePassword es true.
    // Se excluyen las rutas necesarias para el flujo de cambio.
    if (user.mustChangePassword) {
      const allowedPaths = ['/auth/me', '/auth/change-password', '/auth/logout'];
      const isAllowed = allowedPaths.some((p) => req.originalUrl.includes(p));
      if (!isAllowed) {
        return res.status(403).json({
          message: 'Debes cambiar tu contraseña antes de continuar.',
          mustChangePassword: true,
        });
      }
    }

    // 6. Adjuntar el objeto de usuario COMPLETO a la petición (req.user).
    req.user = user;

    // 7. Continuar con el siguiente middleware o la función de ruta.
    next();
  } catch (error) {
    // Manejo de errores si el token es inválido, ha expirado o hay algún otro problema.
    return res.status(401).json({ message: 'Token inválido o expirado.' });
  }
};

// Exportación del middleware para ser utilizado en otras partes de la aplicación.
module.exports = { authMiddleware };
