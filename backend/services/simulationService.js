const prisma = require('../utils/prismaClient');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const parseCycleId = (cycleId) => {
  const parsedCycleId = parseInt(cycleId, 10);

  if (Number.isNaN(parsedCycleId)) {
    throw new Error('ID de ciclo invalido.');
  }

  return parsedCycleId;
};

const assertInstanceCycle = async (instanceId, cycleId) => {
  if (!cycleId) {
    return;
  }

  const instance = await prisma.simulationInstance.findUnique({
    where: { id: parseInt(instanceId, 10) },
    select: { id: true, cycleId: true },
  });

  if (!instance || instance.cycleId !== parseCycleId(cycleId)) {
    throw new Error('Instancia no encontrada para el ciclo seleccionado.');
  }
};

const normalizeHeader = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const resolveInstanceFilePath = (filePath) => {
  const primaryPath = path.resolve(process.cwd(), filePath);
  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }

  const fallbackPath = path.resolve(__dirname, '..', '..', filePath);
  if (fs.existsSync(fallbackPath)) {
    return fallbackPath;
  }

  throw new Error(`Archivo no encontrado en el servidor: ${primaryPath}`);
};

const rankGroup = (items, getKey) => {
  const buckets = new Map();

  for (const item of items) {
    const key = getKey(item);
    if (!key) {
      continue;
    }
    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key).push(item);
  }

  const rankMap = new Map();
  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return a.studentId - b.studentId;
    });
    bucket.forEach((item, index) => {
      rankMap.set(item.id, index + 1);
    });
  }

  return rankMap;
};

const assignRanksForInstance = async (instanceId) => {
  const parsedInstanceId = parseInt(instanceId, 10);
  const results = await prisma.simulationResult.findMany({
    where: { simulationInstanceId: parsedInstanceId },
    include: {
      student: {
        select: {
          id: true,
          studentProfile: {
            select: {
              modality: true,
              group: true,
            },
          },
        },
      },
    },
    orderBy: [
      { totalScore: 'desc' },
      { studentId: 'asc' },
    ],
  });

  if (results.length === 0) {
    return;
  }

  const globalSorted = [...results].sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    return a.studentId - b.studentId;
  });

  const globalRankMap = new Map(
    globalSorted.map((result, index) => [result.id, index + 1])
  );

  const modalityRankMap = rankGroup(
    results,
    (result) => result.student.studentProfile?.modality || null
  );

  const groupRankMap = rankGroup(
    results,
    (result) => result.student.studentProfile?.group || null
  );

  const rankUpdates = results.map((result) =>
    prisma.simulationResult.update({
      where: { id: result.id },
      data: {
        rank: globalRankMap.get(result.id) ?? null,
        rankByModality: modalityRankMap.get(result.id) ?? null,
        rankByGroup: groupRankMap.get(result.id) ?? null,
      },
    })
  );

  await prisma.$transaction(rankUpdates);
};

const assertEventBelongsToCycle = async (eventId, cycleId) => {
  const parsedEventId = parseInt(eventId, 10);
  const parsedCycleId = parseCycleId(cycleId);

  const event = await prisma.simulationEvent.findUnique({
    where: { id: parsedEventId },
    select: { id: true, cycleId: true },
  });

  if (!event) {
    throw new Error('Evento de simulacro no encontrado.');
  }

  if (event.cycleId !== parsedCycleId) {
    throw new Error('El evento no pertenece al ciclo seleccionado.');
  }

  return event;
};

const VALIDATION_STATUS_LABELS = {
  FOUND: 'Encontrado',
  NOT_FOUND: 'No encontrado',
  NOT_ENROLLED: 'No matriculado en ciclo',
  INACTIVE: 'No activo',
};

const cleanupTemporaryFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Error al eliminar el archivo temporal: ${filePath}`, err);
      return;
    }

    console.log(`Archivo temporal eliminado exitosamente: ${filePath}`);
  });
};

const ExcelJS = require('exceljs'); // Asegúrate de tener esta librería instalada
module.exports = {
  //METODO PARA ELIMINAR UNA INSTANCIA DE SIMULACRO (Y SUS RESULTADOS ASOCIADOS)
  deleteSimulationInstance: async (instanceId) => {
    const id = parseInt(instanceId);
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Borrar los Resultados (SimulationResult) asociados a la instancia
        await tx.simulationResult.deleteMany({
          where: { simulationInstanceId: id }
        });

        // 2. Borrar la Instancia (SimulationInstance)
        await tx.simulationInstance.delete({
          where: { id: id }
        });

        return { message: 'Instancia de simulacro y todos sus datos asociados eliminados exitosamente.' };
      });
    } catch (error) {
      console.error("Error en la transacción de eliminación:", error);
      throw error; // El controlador capturará esto
    }
  },

  //metodo para eliminar un evento de simulacro, solo para admin y kami
  // Metodo para eliminar un evento de simulacro y toda su cascada de datos
  deleteSimulationEvent: async (eventId) => {
    const id = parseInt(eventId);
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Obtener todas las instancias asociadas al evento
        const instances = await tx.simulationInstance.findMany({
          where: { eventId: id },
          select: { id: true }
        });
        const instanceIds = instances.map(ins => ins.id);
        // 2. Borrar los Resultados (SimulationResult) de esas instancias
        if (instanceIds.length > 0) {
          await tx.simulationResult.deleteMany({
            where: { simulationInstanceId: { in: instanceIds } }
          });
        }
        // 3. Borrar las Instancias (SimulationInstance)
        await tx.simulationInstance.deleteMany({
          where: { eventId: id }
        });
        // 4. Borrar la relación Muchos a Muchos (SimulationEventModalities)
        await tx.simulationEventModalities.deleteMany({
          where: { eventId: id }
        });
        // 5. Finalmente, borrar el Evento (SimulationEvent)
        await tx.simulationEvent.delete({
          where: { id: id }
        })
        return { message: 'Evento de simulacro y todos sus datos asociados eliminados exitosamente.' };
      });
    } catch (error) {
      console.error("Error en la transacción de eliminación:", error);
      throw error; // El controlador capturará esto
    }
  },

  // --- Servicios para Modalidades Académicas ---
  createAcademicModality: async (modalityData) => {
    return await prisma.academicModality.create({ data: modalityData });
  },

  getAcademicModalities: async () => {
    return await prisma.academicModality.findMany({});
  },

  // --- Servicios para Eventos de Simulacro ---
  createSimulationEvent: async (eventData) => {
    const { name, totalQuestions, thematicSeparation, cycleId } = eventData;
    const parsedCycleId = parseCycleId(cycleId);

    return prisma.simulationEvent.create({
      data: {
        name,
        totalQuestions,
        thematicSeparation,
        cycleId: parsedCycleId,
      },
    });
  },

  getSimulationEvents: async (cycleId) => {
    const parsedCycleId = parseCycleId(cycleId);

    return prisma.simulationEvent.findMany({
      where: { cycleId: parsedCycleId },
      orderBy: { createdAt: 'desc' },
    });
  },

  assertEventBelongsToCycle,

  getSimulationEventsByModality: async (modalityId) => {
    return await prisma.simulationEvent.findMany({
      where: {
        modalities: {
          some: {
            modalityId: parseInt(modalityId),
          },
        },
      },
      include: {
        modalities: { include: { modality: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  saveSimulationEventAnswerKey: async (eventId, answerKey) => {
    return await prisma.simulationEvent.update({
      where: { id: eventId },
      data: { answerKey },
    });
  },

  getSimulationInstancesByEvent: async (eventId, cycleId) => {
    return await prisma.simulationInstance.findMany({
      where: {
        eventId: eventId,
        cycleId: parseCycleId(cycleId),
        results: { some: {} },
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });
  },

  // --- Servicios para el Flujo de Carga y Validación ---
  validateStudentCodes: async (codes, cycleId) => {
    const parsedCycleId = parseCycleId(cycleId);
    const uniqueCodes = [...new Set(codes.map((code) => String(code).trim()).filter(Boolean))];

    const users = await prisma.user.findMany({
      where: {
        documentId: { in: uniqueCodes },
      },
      select: {
        documentId: true,
        status: true,
        cycleEnrollments: {
          where: { cycleId: parsedCycleId },
          select: { id: true },
        },
      },
    });

    const userMap = new Map(users.map((user) => [user.documentId, user]));

    return uniqueCodes.map((code) => {
      const user = userMap.get(code);

      if (!user) {
        return {
          code,
          status: 'NOT_FOUND',
          label: VALIDATION_STATUS_LABELS.NOT_FOUND,
          found: false,
        };
      }

      if (user.status !== 'ACTIVE') {
        return {
          code,
          status: 'INACTIVE',
          label: VALIDATION_STATUS_LABELS.INACTIVE,
          found: false,
        };
      }

      if (!user.cycleEnrollments || user.cycleEnrollments.length === 0) {
        return {
          code,
          status: 'NOT_ENROLLED',
          label: VALIDATION_STATUS_LABELS.NOT_ENROLLED,
          found: false,
        };
      }

      return {
        code,
        status: 'FOUND',
        label: VALIDATION_STATUS_LABELS.FOUND,
        found: true,
      };
    });
  },

  createSimulationInstance: async (eventId, userId, fileName, cycleId) => {
    const filePath = `backend/tmp/simulations/${eventId}-${Date.now()}-${fileName}`;
    return await prisma.simulationInstance.create({
      data: {
        fileName,
        filePath,
        uploadedById: userId,
        cycleId: parseCycleId(cycleId),
        eventId: eventId,
      },
    });
  },

  importProcessedSimulationResults: async (instanceId, cycleId) => {
    await assertInstanceCycle(instanceId, cycleId);

    const instance = await prisma.simulationInstance.findUnique({
      where: { id: parseInt(instanceId, 10) },
      select: {
        id: true,
        cycleId: true,
        filePath: true,
      },
    });

    if (!instance) {
      throw new Error('Instancia de simulacro no encontrada.');
    }

    const absolutePath = resolveInstanceFilePath(instance.filePath);
    const workbook = XLSX.readFile(absolutePath);
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      throw new Error('El archivo no contiene hojas para importar.');
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });

    if (rows.length < 2) {
      throw new Error('El archivo no contiene filas de resultados para importar.');
    }

    const headers = rows[0].map(normalizeHeader);
    const requiredHeaders = ['codigo', 'nombres', 'apellidos', 'puntaje'];
    const hasValidHeaders = requiredHeaders.every((header, index) => headers[index] === header);

    if (!hasValidHeaders) {
      throw new Error('El archivo debe tener las columnas: codigo, nombres, apellidos, puntaje.');
    }

    const dataRows = rows.slice(1);
    const firstOccurrenceCodes = [];
    const seenCodes = new Set();
    const duplicateCodes = new Set();
    const duplicateRows = [];
    const invalidScoreRows = [];
    const emptyCodeRows = [];

    for (const row of dataRows) {
      const code = String(row[0] || '').trim();
      const parsedScore = Number.parseFloat(String(row[3] || '').replace(',', '.'));

      if (!code) {
        emptyCodeRows.push({ row: row.slice(0, 4) });
        continue;
      }

      if (seenCodes.has(code)) {
        duplicateCodes.add(code);
        duplicateRows.push(code);
        continue;
      }

      if (!Number.isFinite(parsedScore)) {
        invalidScoreRows.push({ code, rawScore: row[3] });
        continue;
      }

      seenCodes.add(code);
      firstOccurrenceCodes.push({
        code,
        score: parsedScore,
      });
    }

    const studentCodes = firstOccurrenceCodes.map((entry) => entry.code);
    const students = await prisma.user.findMany({
      where: {
        documentId: { in: studentCodes },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        documentId: true,
        cycleEnrollments: {
          where: {
            cycleId: instance.cycleId,
          },
          select: { id: true },
        },
      },
    });

    const studentMap = new Map(students.map((student) => [student.documentId, student]));
    const resultsToCreate = [];
    const missingCodes = [];
    const notEnrolledCodes = [];

    for (const entry of firstOccurrenceCodes) {
      const student = studentMap.get(entry.code);

      if (!student) {
        missingCodes.push(entry.code);
        continue;
      }

      if (!student.cycleEnrollments || student.cycleEnrollments.length === 0) {
        notEnrolledCodes.push(entry.code);
        continue;
      }

      resultsToCreate.push({
        simulationInstanceId: instance.id,
        studentId: student.id,
        totalScore: entry.score,
        scoresBySegment: {},
      });
    }

    if (resultsToCreate.length === 0) {
      throw new Error('No se encontraron resultados validos para importar en el ciclo seleccionado.');
    }

    await prisma.$transaction([
      prisma.simulationResult.deleteMany({
        where: { simulationInstanceId: instance.id },
      }),
      prisma.simulationResult.createMany({
        data: resultsToCreate,
      }),
    ]);

    await assignRanksForInstance(instance.id);
    cleanupTemporaryFile(absolutePath);

    const summary = {
      rowsRead: dataRows.length,
      imported: resultsToCreate.length,
      duplicateCodes: Array.from(duplicateCodes),
      duplicateCount: duplicateRows.length,
      missingCodes,
      missingCount: missingCodes.length,
      notEnrolledCodes,
      notEnrolledCount: notEnrolledCodes.length,
      invalidScores: invalidScoreRows,
      invalidScoreCount: invalidScoreRows.length,
      emptyCodeCount: emptyCodeRows.length,
    };

    await prisma.simulationInstance.update({
      where: { id: instance.id },
      data: {
        importType: 'PROCESSED',
        importSummary: summary,
      },
    });

    return { summary };
  },

  processSimulationResults: async (instanceId, cycleId) => {
    // 1. OBTENER DATOS PRIMERO
    // No puedes usar "instance" si aún no has hecho el await de prisma
    const instance = await prisma.simulationInstance.findUnique({
      where: { id: parseInt(instanceId) },
      include: { event: true },
    });

    // Validaciones iniciales
    if (!instance) throw new Error('Instancia de simulacro no encontrada.');
    if (cycleId && instance.cycleId !== parseCycleId(cycleId)) throw new Error('Instancia no encontrada para el ciclo seleccionado.');
    if (!instance.event) throw new Error('Evento de simulacro no encontrado.');
    if (!instance.event.answerKey) throw new Error('La clave de respuestas no ha sido definida.');

    // 2. DEFINIR RUTAS Y VARIABLES
    const { answerKey, totalQuestions, thematicSeparation } = instance.event;
    
    const absolutePath = resolveInstanceFilePath(instance.filePath);

    console.log("Intentando leer archivo en:", absolutePath);

    // 4. LEER EXCEL
    // Usamos absolutePath para asegurar que XLSX encuentre el archivo
    const workbook = XLSX.readFile(absolutePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });

    const studentRows = data.slice(1);
    const resultsToCreate = [];

    // 5. OBTENER ESTUDIANTES DE LA BD
    const studentDocumentIds = studentRows
      .map(row => String(row[0]).trim())
      .filter(id => id && id !== 'undefined');

    const studentsInDb = await prisma.user.findMany({
      where: {
        documentId: { in: studentDocumentIds },
        status: 'ACTIVE',
        cycleEnrollments: {
          some: {
            cycleId: instance.cycleId,
          },
        },
      },
    });

    const studentMap = new Map(studentsInDb.map(s => [s.documentId, s]));

    // 6. PROCESAMIENTO DE FILAS
    for (const row of studentRows) {
      const documentId = String(row[0]).trim();
      if (!documentId) continue;

      const student = studentMap.get(documentId);
      if (!student) {
        console.warn(`⚠️ DNI ${documentId} no está en la base de datos. Saltando...`);
        continue;
      }

      let totalScore = 0;
      const scoresBySegment = {};

      // Inicializar segmentos
      if (thematicSeparation && Array.isArray(thematicSeparation)) {
        thematicSeparation.forEach(s => {
          if (s.tema) scoresBySegment[s.tema] = 0;
        });
      }

      const studentAnswers = row.slice(1, totalQuestions + 1);

      for (let i = 0; i < totalQuestions; i++) {
        const qNum = i + 1;
        const correctAnswer = answerKey[String(qNum)];
        const studentAnswer = studentAnswers[i] ? String(studentAnswers[i]).trim() : null;

        let qScore = 0;
        if (studentAnswer && correctAnswer) {
          qScore = (studentAnswer.toUpperCase() === correctAnswer.toUpperCase()) ? 4 : -1;
        }
        totalScore += qScore;

        if (thematicSeparation) {
          const segment = thematicSeparation.find(s =>
            qNum >= parseInt(s.inicio) && qNum <= parseInt(s.fin)
          );
          if (segment && segment.tema) {
            scoresBySegment[segment.tema] = (scoresBySegment[segment.tema] || 0) + qScore;
          }
        }
      }

      resultsToCreate.push({
        simulationInstanceId: instance.id,
        studentId: student.id,
        totalScore,
        scoresBySegment,
      });
    }

    if (resultsToCreate.length === 0) {
      throw new Error('No se encontraron coincidencias de DNI entre el Excel y la Base de Datos.');
    }

    // 7. PERSISTENCIA Y RANKING
    await prisma.$transaction([
      prisma.simulationResult.deleteMany({
        where: { simulationInstanceId: instance.id },
      }),
      prisma.simulationResult.createMany({
        data: resultsToCreate,
      }),
    ]);

    await assignRanksForInstance(instance.id);
    cleanupTemporaryFile(absolutePath);

    await prisma.simulationInstance.update({
      where: { id: instance.id },
      data: {
        importType: 'RAW',
        importSummary: {
          processed: resultsToCreate.length,
          skipped: studentRows.length - resultsToCreate.length,
        },
      },
    });

    return { message: `Procesados ${resultsToCreate.length} resultados exitosamente.` };
  },

  getSimulationResults: async (instanceId, cycleId) => {
    await assertInstanceCycle(instanceId, cycleId);
    const parsedInstanceId = parseInt(instanceId, 10);

    const instance = await prisma.simulationInstance.findUnique({
      where: { id: parsedInstanceId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            cycleId: true,
            totalQuestions: true,
          },
        },
        cycle: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!instance) {
      throw new Error('Instancia de simulacro no encontrada.');
    }

    const results = await prisma.simulationResult.findMany({
      where: { simulationInstanceId: parsedInstanceId },
      include: {
        simulationInstance: {
          select: { fileName: true },
        },
        student: {
          select: {
            firstName: true,
            lastName: true,
            documentId: true,
            studentProfile: {
              select: {
                modality: true,
                group: true,
              },
            },
          },
        },
      },
      orderBy: { rank: 'asc' },
    });

    return { instance, results };
  },
  
  searchStudents: async (query, cycleId) => {
    const parsedCycleId = parseCycleId(cycleId);
    const normalizedQuery = query.trim();

    const enrollments = await prisma.cycleEnrollment.findMany({
      where: {
        cycleId: parsedCycleId,
        user: {
          status: 'ACTIVE',
          OR: [
            { documentId: { contains: normalizedQuery, mode: 'insensitive' } },
            { firstName: { contains: normalizedQuery, mode: 'insensitive' } },
            { lastName: { contains: normalizedQuery, mode: 'insensitive' } },
          ],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            documentId: true,
            firstName: true,
            lastName: true,
            studentProfile: {
              select: { modality: true, group: true },
            },
          },
        },
      },
      take: 20,
      orderBy: [
        { user: { lastName: 'asc' } },
        { user: { firstName: 'asc' } },
      ],
    });

    return enrollments.map((enr) => ({
      id: enr.user.id,
      documentId: enr.user.documentId,
      firstName: enr.user.firstName,
      lastName: enr.user.lastName,
      fullName: `${enr.user.firstName} ${enr.user.lastName}`.trim(),
      modality: enr.user.studentProfile?.modality || null,
      group: enr.user.studentProfile?.group || null,
    }));
  },

  getStudentAcademicStatus: async (studentId, cycleId) => {
    const parsedCycleId = parseCycleId(cycleId);

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        documentId: true,
        firstName: true,
        lastName: true,
        studentProfile: {
          select: { modality: true, group: true },
        },
      },
    });

    if (!student) {
      throw new Error('Estudiante no encontrado.');
    }

    const results = await prisma.simulationResult.findMany({
      where: {
        studentId: studentId,
        simulationInstance: {
          cycleId: parsedCycleId,
        },
      },
      select: {
        id: true,
        totalScore: true,
        scoresBySegment: true,
        rank: true,
        rankByModality: true,
        rankByGroup: true,
        simulationInstance: {
          select: {
            uploadedAt: true,
            fileName: true,
            event: {
              select: { name: true, totalQuestions: true },
            },
          },
        },
      },
      orderBy: {
        simulationInstance: { uploadedAt: 'desc' },
      },
    });

    const notas = results.map((r) => r.totalScore);
    const averageScore = notas.length > 0
      ? +(notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(2)
      : 0;

    return {
      student: {
        id: student.id,
        documentId: student.documentId,
        firstName: student.firstName,
        lastName: student.lastName,
        modality: student.studentProfile?.modality || null,
        group: student.studentProfile?.group || null,
      },
      summary: {
        simulacrosCount: results.length,
        averageScore,
      },
      results: results.map((r) => ({
        id: r.id,
        date: r.simulationInstance.uploadedAt,
        eventName: r.simulationInstance.event?.name || 'Simulacro',
        totalQuestions: r.simulationInstance.event?.totalQuestions || 0,
        totalScore: r.totalScore,
        scoresBySegment: r.scoresBySegment || {},
        rank: r.rank,
        rankByModality: r.rankByModality,
        rankByGroup: r.rankByGroup,
        fileName: r.simulationInstance.fileName,
      })),
    };
  },

  getStudentSimulationResults: async (studentId) => {
    const parsedStudentId = parseInt(studentId, 10);

    const enrollments = await prisma.cycleEnrollment.findMany({
      where: { userId: parsedStudentId },
      select: { cycleId: true },
    });

    const enrolledCycleIds = enrollments.map((enrollment) => enrollment.cycleId);

    if (enrolledCycleIds.length === 0) {
      return [];
    }

    const results = await prisma.simulationResult.findMany({
      where: {
        studentId: parsedStudentId,
        simulationInstance: {
          cycleId: { in: enrolledCycleIds },
        },
      },
      select: {
        id: true,
        totalScore: true,
        rank: true,
        rankByModality: true,
        rankByGroup: true,
        simulationInstance: {
          select: {
            uploadedAt: true,
            fileName: true,
            event: {
              select: {
                name: true,
                totalQuestions: true,
              },
            },
            cycle: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return results
      .sort(
        (a, b) => new Date(b.simulationInstance.uploadedAt) - new Date(a.simulationInstance.uploadedAt)
      )
      .map((result) => ({
        id: result.id,
        date: result.simulationInstance.uploadedAt,
        score: result.totalScore,
        rank: result.rank,
        rankByModality: result.rankByModality,
        rankByGroup: result.rankByGroup,
        eventName: result.simulationInstance.event?.name || 'Simulacro',
        totalQuestions: result.simulationInstance.event?.totalQuestions || 0,
        cycleName: result.simulationInstance.cycle?.name || '',
        fileName: result.simulationInstance.fileName,
      }));
  },

exportSimulationResults: async (instanceId, cycleId) => {
    await assertInstanceCycle(instanceId, cycleId);
    // 1. Obtener datos de Prisma (incluyendo totalScore y scoresBySegment)
    const results = await prisma.simulationResult.findMany({
        where: { simulationInstanceId: parseInt(instanceId) },
        include: {
            student: {
                select: {
                  firstName: true,
                  lastName: true,
                  documentId: true,
                  studentProfile: {
                    select: {
                      modality: true,
                      group: true,
                    },
                  },
                },
            },
        },
        orderBy: { rank: 'asc' },
    });

    if (!results || results.length === 0) {
        throw new Error('No hay resultados para exportar en esta instancia.');
    }

    // 2. Cargar la plantilla existente
    const workbook = new ExcelJS.Workbook();
    // Ajusta la ruta si 'tmp' está en la raíz de tu proyecto o en otra ubicación
    const templatePath = path.join(process.cwd(), 'tmp', 'PLANTILLA.xlsx');
    
    await workbook.xlsx.readFile(templatePath);
    
    // Seleccionamos la primera hoja
    const worksheet = workbook.getWorksheet(1);

    // 3. Definir fila de inicio (donde empiezan los datos en tu plantilla)
    // Si tu plantilla tiene encabezados en la fila 1, empezamos en la 2.
    let currentRow = 6; 

    results.forEach(res => {
        const row = worksheet.getRow(currentRow);
        
        // Mapeo manual a las celdas de la plantilla (A, B, C, D...)
        // Asegúrate de que el orden coincida con las columnas de tu Excel y los empesamos a llenar desde la fila 6
        // porque la 1 es el encabezado de la plantilla   

        row.getCell(1).value = res.rank;
        row.getCell(2).value = res.student.documentId;
        row.getCell(3).value = res.student.firstName;
        row.getCell(4).value = res.student.lastName;
        row.getCell(5).value = res.student.studentProfile?.modality || '';
        row.getCell(6).value = res.student.studentProfile?.group || '';
        row.getCell(7).value = parseFloat((res.totalScore / 5).toFixed(2));
        row.getCell(8).value = res.totalScore;
        row.getCell(9).value = res.rankByModality ?? '';
        row.getCell(10).value = res.rankByGroup ?? '';

        // Si tienes segmentos dinámicos, puedes seguir agregándolos en las celdas G, H...
        if (res.scoresBySegment) {
            let segmentCol = 11;
            Object.values(res.scoresBySegment).forEach(val => {
                row.getCell(segmentCol).value = val;
                segmentCol++;
            });
        }

        // Aplicar bordes básicos a la fila para que se vea bien
        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        row.commit(); // Guardar cambios de la fila
        currentRow++;
    });

    // 4. Generar el Buffer para enviar al controlador
    const excelBuffer = await workbook.xlsx.writeBuffer();

    return excelBuffer;
}
};

