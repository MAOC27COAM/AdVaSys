// Importación de módulos y dependencias.
const express = require('express');
const multer = require('multer'); // Middleware para manejar la subida de archivos.
const xlsx = require('xlsx');     // Librería para leer y parsear archivos Excel.
const prisma = require('../../utils/prismaClient'); // Cliente de Prisma para interactuar con la base de datos.
const { authMiddleware } = require('../../middlewares/authMiddleware'); // Middleware de autenticación.

// Inicialización del router de Express.
const router = express.Router();

// Configuración de Multer para almacenar archivos en memoria.
// Esto es útil para procesar archivos pequeños directamente sin guardarlos en disco.
const upload = multer({ storage: multer.memoryStorage() });

// --- Endpoint para Subir y Procesar un Archivo Excel de Tabla de Posiciones ---
// Ruta: POST /api/leaderboard/upload
// Requiere autenticación y el archivo Excel debe ser enviado en un campo llamado 'leaderboardFile'.
router.post('/upload', authMiddleware, upload.single('leaderboardFile'), async (req, res) => {
  // 1. Autorización: Solo los usuarios con rol 'admin' pueden subir archivos de tabla de posiciones.
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente.' });
  }

  // 2. Validación de la Petición: Se verifica que se haya subido un archivo y que los datos requeridos estén presentes.
  if (!req.file) {
    return res.status(400).json({ error: 'No se ha subido ningún archivo.' });
  }

  const { modality, examName } = req.body;
  if (!modality || !examName) {
    return res.status(400).json({ error: 'Faltan datos requeridos: modalidad y nombre del examen.' });
  }

  try {
    // --- MITIGACIÓN DE VULNERABILIDADES XLSX ---
    // Nota crítica sobre la seguridad: La librería 'xlsx' tiene vulnerabilidades conocidas (Prototype Pollution, ReDoS).
    // Es CRÍTICO validar estrictamente la entrada del archivo Excel antes de procesarlo para reducir la superficie de ataque.
    // A futuro, se recomienda considerar reemplazar 'xlsx' por una alternativa más segura como 'exceljs'.
    // -----------------------------------------------------------------------------------

    // 3. Procesamiento del archivo Excel.
    // Se lee el archivo desde el buffer de memoria.
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Se toma la primera hoja del libro.
    const worksheet = workbook.Sheets[sheetName];
    // Se convierte la hoja a un array de arrays para validar los encabezados.
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length === 0) {
      return res.status(400).json({ error: 'El archivo Excel está vacío o tiene un formato incorrecto.' });
    }

    const headers = data[0]; // La primera fila se considera los encabezados.
    const requiredHeaders = ['NOMBRE', 'PUNTOS', 'PUNTAJE']; // Encabezados esperados.

    // Se verifica que todos los encabezados requeridos estén presentes.
    const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
      return res.status(400).json({ error: `Faltan las siguientes columnas en el archivo Excel: ${missingHeaders.join(', ')}.` });
    }

    // Se vuelve a convertir la hoja a JSON, esta vez con detección automática de encabezados para facilitar el mapeo.
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    // 4. Mapeo de los datos del Excel al modelo de Prisma `LeaderboardEntry`.
    const leaderboardEntries = jsonData.map(row => {
      // Se asume que el Excel tiene columnas con nombres específicos.
      const rank = parseInt(row['PUNTOS'], 10); // 'PUNTOS' se usa para el puesto.
      const score = parseFloat(row['PUNTAJE']); // 'PUNTAJE' se usa para la puntuación.
      const studentName = row['NOMBRE']; // 'NOMBRE' se usa para el nombre del estudiante.

      // Validación de los datos mapeados.
      if (isNaN(rank) || isNaN(score) || !studentName) {
        throw new Error('Una o más filas del Excel tienen datos inválidos o faltantes. Verifique las columnas NOMBRE, PUNTOS y PUNTAJE.');
      }

      return {
        modality,
        examName,
        studentName,
        rank,
        score,
      };
    });

    // 5. Transacción de Base de Datos:
    // Se utiliza una transacción para asegurar que la operación de actualización sea atómica.
    // Primero se eliminan las entradas antiguas y luego se crean las nuevas.
    await prisma.$transaction(async (tx) => {
      // a. Borrar las entradas existentes para la misma modalidad y nombre de examen.
      await tx.leaderboardEntry.deleteMany({
        where: {
          modality: modality,
          examName: examName,
        },
      });

      // b. Crear todas las nuevas entradas de la tabla de posiciones.
      await tx.leaderboardEntry.createMany({
        data: leaderboardEntries,
      });
    });

    // Respuesta exitosa.
    res.status(201).json({ message: `Tabla de posiciones para '${examName}' en la modalidad '${modality}' actualizada exitosamente.` });

  } catch (error) {
    // Manejo de errores durante el procesamiento o la transacción.
    res.status(400).json({ error: error.message });
  }
});

// --- Endpoint para Obtener Tablas de Posiciones para el Estudiante Autenticado ---
// Ruta: GET /api/leaderboard
// Requiere autenticación y está diseñado para que los estudiantes vean sus clasificaciones.
router.get('/', authMiddleware, async (req, res) => {
  // 1. Autorización: Solo los usuarios con rol 'student' pueden acceder a esta función.
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Acceso denegado. Esta función es solo para estudiantes.' });
  }

  try {
    // 2. Búsqueda del perfil del estudiante para obtener su modalidad.
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!studentProfile) {
      return res.status(404).json({ error: 'No se encontró el perfil del estudiante asociado.' });
    }

    const { modality } = studentProfile;

    // 3. Obtención de todas las entradas de la tabla de posiciones para la modalidad del estudiante.
    const entries = await prisma.leaderboardEntry.findMany({
      where: { modality },
      orderBy: [
        { examName: 'desc' }, // Se agrupan los resultados por nombre de examen (descendente).
        { rank: 'desc' },      // Se ordenan por puesto de forma descendente.
      ],
    });

    // 4. Agrupación de los resultados por nombre de examen para una mejor presentación.
    const groupedByExam = entries.reduce((acc, entry) => {
      const { examName } = entry;
      if (!acc[examName]) {
        acc[examName] = [];
      }
      acc[examName].push(entry);
      return acc;
    }, {});

    res.json(groupedByExam);

  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor al obtener las tablas de posiciones.' });
  }
});

// Exportación del router para ser usado en app.js.
module.exports = router;
