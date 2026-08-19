// Importación de módulos y dependencias necesarias.
const express = require('express'); // Framework principal para construir la aplicación web.
const cors = require('cors');       // Middleware para habilitar el Cross-Origin Resource Sharing (CORS), permitiendo peticiones desde otros dominios.
const helmet = require('helmet');   // Middleware que mejora la seguridad de la aplicación estableciendo diversas cabeceras HTTP.
const morgan = require('morgan');   // Middleware para registrar (loggear) las peticiones HTTP que llegan al servidor.
const rateLimit = require('express-rate-limit'); // Middleware de límite de solicitudes.
const path = require('path');

// Importación de los módulos de rutas de la aplicación.
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courseModuleRoutes');
const materialRoutes = require('./routes/materialModuleRoutes'); // NUEVO: Importar rutas de materiales
const leaderboardRoutes = require('./routes/leaderboard');
const cycleRoutes = require('./routes/cycles'); // Importar las nuevas rutas de ciclos
const studentRoutes = require('./routes/students'); // Importar las nuevas rutas de estudiantes
const simulationRoutes = require('./routes/simulations'); // NUEVO: Importar rutas de simulaciones
const attendanceRoutes = require('./routes/attendance'); // NUEVO: Importar rutas de asistencia
const scheduleRoutes = require('./routes/schedules'); // NUEVO: Importar rutas de horarios
const gradeRoutes = require('./routes/grades'); // NUEVO: Importar rutas de calificaciones
const PerfilRoutes = require('./routes/Perfil'); // NUEVO: Importar rutas de perfil
const paymentRoutes = require('./routes/payments');
const backupRoutes = require('./routes/backup');
// Importación de middlewares personalizados.
const { authMiddleware } = require('../middlewares/authMiddleware'); // Middleware para proteger rutas y verificar la autenticación del usuario.
const PerfilController = require('../controllers/PerfilController');

// Inicialización de la aplicación Express.
const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Configuración de Middlewares globales para la aplicación.
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
  })
);
app.use(helmet());                                  // Aplica cabeceras de seguridad para proteger contra vulnerabilidades comunes.
app.use(morgan('dev'));                             // Usa el formato 'dev' para los logs de Morgan, que es conciso y coloreado.

// Límite de solicitudes global por IP (protección básica ante abuso).
// El límite de autenticación (más estricto) se define en routes/auth.js.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: { message: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

app.use(express.json());                            // Middleware nativo de Express para parsear el cuerpo de las peticiones entrantes con formato JSON.
app.use('/uploads/course-covers', express.static(path.join(__dirname, '..', 'uploads', 'course-covers')));
app.use('/uploads/profile-pictures', express.static(path.join(__dirname, '..', 'uploads', 'profile-pictures')));
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'backend',
    timestamp: new Date().toISOString(),
  });
});

// Definición y asignación de las rutas de la API.
// Las rutas relacionadas con la autenticación (login, registro) se manejarán en '/api/auth'.
app.use('/api/auth', authRoutes);

// Las siguientes rutas requieren autenticación, por lo que se podrían proteger globalmente aquí o individualmente en cada archivo de rutas.
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/materials', materialRoutes); // NUEVO: Registrar rutas de materiales
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/cycles', cycleRoutes); // Registrar las nuevas rutas de ciclos
app.use('/api/students', studentRoutes); // Registrar las nuevas rutas de estudiantes
app.use('/api/simulations', simulationRoutes); // NUEVO: Registrar rutas de simulaciones
app.use('/api/attendance', attendanceRoutes); // NUEVO: Registrar rutas de asistencia
app.use('/api/schedules', scheduleRoutes); // NUEVO: Registrar rutas de horarios
app.use('/api/grades', gradeRoutes); // NUEVO: Registrar rutas de calificaciones
//nuevo para el modulo de perfil
app.use('/api/Perfil', PerfilRoutes); // Registrar rutas de perfil
app.use('/api/payments', paymentRoutes);
app.use('/api/system/backup', backupRoutes);

// Middleware de manejo de errores para capturar y responder a errores de manera uniforme.
app.use((err, req, res, next) => {
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'El archivo excede el tamaño máximo permitido de 20 MB.',
      });
    }

    return res.status(400).json({
      error: 'Ocurrió un error al procesar el archivo adjunto.',
      details: err.message,
    });
  }

  const statusCode = err.statusCode || 500;
  const payload = {
    error:
      err.message || 'Se produjo un error inesperado mientras se procesaba la solicitud.',
  };

  if (err.details) {
    payload.details = err.details;
  }

  if (statusCode >= 500) {
    console.error('[AppError]', err);
  }

  return res.status(statusCode).json(payload);
});

module.exports = app;
