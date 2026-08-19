// Importación de módulos y dependencias.
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const prisma = require('../../utils/prismaClient');
const { config } = require('../../utils/config');
const { authMiddleware } = require('../../middlewares/authMiddleware');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const jwtExpiresByRole = {
  student: '2h',
  matriculador: '12h',
  admin: '8h',
  kami: '12h',
};

// --- Endpoint para el Registro de Nuevos Usuarios ---
// Ruta: POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    // Extracción de datos del cuerpo de la petición.
    const { username, firstName, lastName, email, password, documentId, profilePictureUrl, role } = req.body;

    // Validación de campos obligatorios
    if (!username || !password || !firstName || !lastName || !documentId) {
      return res.status(400).json({ message: 'Faltan campos obligatorios: username, password, firstName, lastName, documentId.' });
    }

    // Verificación de que el username no esté ya en uso.
    const existingUserByUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUserByUsername) {
      return res.status(400).json({ message: 'El nombre de usuario ya está registrado.' });
    }

    // Verificación de que el email no esté ya en uso, solo si se proporciona un email.
    if (email) {
      const existingUserByEmail = await prisma.user.findFirst({ where: { email } });
      if (existingUserByEmail) {
        return res.status(400).json({ message: 'El email ya está registrado.' });
      }
    }

    // Búsqueda del ID del rol basado en su nombre. Por defecto, se asigna el rol 'user'.
    const roleRecord = await prisma.role.findUnique({ where: { name: role || 'student' } });
    if (!roleRecord) {
      return res.status(400).json({ message: 'El rol especificado no existe' });
    }

    // Encriptación de la contraseña antes de guardarla en la base de datos.
    const hashedPassword = await bcrypt.hash(password, 10);

    // Creación del nuevo usuario en la base de datos.
    const user = await prisma.user.create({
      data: {
        username,
        firstName,
        lastName,
        email, // Puede ser nulo
        password: hashedPassword,
        documentId,
        profilePictureUrl, // Campo opcional
        roleId: roleRecord.id, // Se asigna el ID del rol encontrado.
      },
    });

    // Respuesta exitosa al cliente.
    res.status(201).json({ message: 'Usuario registrado exitosamente', user: { id: user.id, username: user.username, email: user.email , } });
  } catch (err) {
    // Manejo de errores.
    res.status(500).json({ message: 'Error en el servidor al registrar el usuario', error: err.message });
  }
});

// --- Endpoint para el Inicio de Sesión ---
// Ruta: POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body; // CORREGIDO: esperar 'username'

    // Búsqueda del usuario únicamente por su username, incluyendo la información del rol.
    const user = await prisma.user.findUnique({
      where: {
        username: username // CORREGIDO: usar 'username'
      },
      include: {
        role: true
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Usuario inactivo. No tiene acceso al sistema.' });
    }

    // Comparación de la contraseña proporcionada con la contraseña encriptada almacenada.
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    // Creación del JSON Web Token (JWT) si las credenciales son válidas.
    const tokenExpiresIn = jwtExpiresByRole[user.role.name] || config.jwtExpiresIn;

    const token = jwt.sign(
      { id: user.id, role: user.role.name },
      config.jwtSecret,
      { expiresIn: tokenExpiresIn }
    );

    // Envío del token al cliente.
    res.json({
      token,
      mustChangePassword: user.mustChangePassword,
    });
  } catch (err) {
    console.error("❌ Error en login:", err);
    res.status(500).json({ message: 'Error en el servidor al iniciar sesión', error: err.message });
  }
});

// --- Endpoint para Obtener el Perfil del Usuario Autenticado ---
// Ruta: GET /api/auth/me
// Esta ruta está protegida por el authMiddleware.
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // El ID del usuario se obtiene del token decodificado (añadido por authMiddleware en req.user).
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      // Selección de los campos que se quieren devolver (para no exponer datos sensibles como la contraseña).
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        documentId: true,
        profilePictureUrl: true,
        status: true,
        mustChangePassword: true,
        role: { // Se incluye la información del rol relacionado.
          select: {
            name: true // Se selecciona solo el nombre del rol.
          }
        }
      }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener el perfil del usuario', error: err.message });
  }
});

// --- Endpoint para Cambiar Contraseña ---
// Ruta: POST /api/auth/change-password
router.post('/change-password', authLimiter, authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Se requiere contraseña actual y nueva contraseña.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: false,
      },
    });

    res.json({ message: 'Contraseña actualizada exitosamente.' });
  } catch (err) {
    res.status(500).json({ message: 'Error al cambiar la contraseña', error: err.message });
  }
});

// --- RUTA DE DIAGNÓSTICO ---
// Permite a los desarrolladores verificar rápidamente los roles disponibles en la base de datos.
// Ruta: GET /api/auth/roles
router.get('/roles', async (req, res) => {
  try {
    console.log('Endpoint de diagnóstico /roles alcanzado. Buscando roles...');
    const roles = await prisma.role.findMany();
    console.log('Roles encontrados:', roles);
    res.json(roles);
  } catch (err) {
    console.error('Error en el endpoint de diagnóstico /roles:', err);
    res.status(500).json({ message: 'Error al obtener los roles', error: err.message });
  }
});

// Exportación del router para ser usado en app.js.
module.exports = router;
