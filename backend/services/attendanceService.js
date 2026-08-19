const prisma = require('../utils/prismaClient');

const parseCycleId = (cycleId) => {
  const parsedCycleId = parseInt(cycleId, 10);

  if (Number.isNaN(parsedCycleId)) {
    throw new Error('ID de ciclo invalido.');
  }

  return parsedCycleId;
};

const parseSessionId = (sessionId) => {
  const parsedSessionId = parseInt(sessionId, 10);

  if (Number.isNaN(parsedSessionId)) {
    throw new Error('ID de sesion invalido.');
  }

  return parsedSessionId;
};

const VALID_ATTENDANCE_STATUSES = new Set(['PRESENT', 'ABSENT', 'LATE']);

const mapAttendanceHistoryRecord = (record) => ({
  id: record.id,
  timestamp: record.timestamp,
  status: record.status,
  sessionId: record.session?.id || record.sessionId || null,
  sessionName: record.session?.name || null,
  sessionStartTime: record.session?.StartTime || null,
  cycleId: record.session?.cycle?.id || null,
  cycleName: record.session?.cycle?.name || null,
  student: record.user
    ? {
        id: record.user.id,
        firstName: record.user.firstName,
        lastName: record.user.lastName,
        documentId: record.user.documentId,
      }
    : null,
});

const ensureSessionInCycle = async (sessionId, cycleId) => {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: parseSessionId(sessionId) },
    select: { id: true, cycleId: true, endTime: true },
  });

  if (!session || session.cycleId !== parseCycleId(cycleId)) {
    throw new Error('Sesion no encontrada para el ciclo seleccionado.');
  }

  return session;
};

module.exports = {
  startSession: async (name, cycleId) => {
    const now = new Date();
    const session = await prisma.attendanceSession.create({
      data: {
        name: name || `Sesion - ${now.toLocaleTimeString()}`,
        StartTime: now,
        cycleId: parseCycleId(cycleId),
      },
    });
    return session;
  },

  getAllSessions: async (cycleId) => {
    return prisma.attendanceSession.findMany({
      where: {
        cycleId: parseCycleId(cycleId),
      },
      orderBy: {
        StartTime: 'desc',
      },
      include: {
        _count: {
          select: { records: true },
        },
      },
    });
  },

  getSessionDetails: async (sessionId, cycleId) => {
    const parsedSessionId = parseSessionId(sessionId);
    await ensureSessionInCycle(parsedSessionId, cycleId);

    const session = await prisma.attendanceSession.findUnique({
      where: { id: parsedSessionId },
      include: {
        records: {
          orderBy: {
            timestamp: 'asc',
          },
          include: {
            user: {
              select: {
                id: true,
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
        },
      },
    });

    return session ? session.records : [];
  },

  getAllUsers: async (cycleId, filters = {}) => {
    const modalityFilter = filters.modality && filters.modality !== 'ALL' ? filters.modality : undefined;
    const groupFilter = filters.group && filters.group !== 'ALL' ? filters.group : undefined;
    const sessionType = filters.sessionType || undefined;

    const allowedSchedules = sessionType
      ? ({
          TURN_MANANA: ['TURNO_MANANA', 'TURNO_COMPLETO'],
          TURN_TARDE: ['TURNO_TARDE', 'TURNO_COMPLETO'],
        })[sessionType]
      : null;

    const enrollments = await prisma.cycleEnrollment.findMany({
      where: {
        cycleId: parseCycleId(cycleId),
        user: {
          status: 'ACTIVE',
          role: {
            name: 'student',
          },
        },
      },
      select: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            documentId: true,
            phone: true,
            studentProfile: {
              select: {
                modality: true,
                group: true,
                schedule: true,
                guardianPhone: true,
              },
            },
            role: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: {
        enrollmentDate: 'desc',
      },
    });

    return enrollments
      .map(({ user }) => user)
      .filter((user) => {
        const matchesModality = !modalityFilter || user.studentProfile?.modality === modalityFilter;
        const matchesGroup = !groupFilter || user.studentProfile?.group === groupFilter;
        const matchesSchedule = !allowedSchedules || allowedSchedules.includes(user.studentProfile?.schedule);
        return matchesModality && matchesGroup && matchesSchedule;
      });
  },

  recordAttendance: async (identifierType, identifierValue, status, sessionId) => {
    const parsedSessionId = parseSessionId(sessionId);
    const session = await prisma.attendanceSession.findUnique({
      where: { id: parsedSessionId },
      select: { id: true, cycleId: true },
    });

    if (!session) {
      throw new Error('Sesion no encontrada para el ciclo seleccionado.');
    }

    const normalizedStatus = VALID_ATTENDANCE_STATUSES.has(status) ? status : 'PRESENT';

    let user;

    if (identifierType === 'documentId') {
      user = await prisma.user.findFirst({
        where: {
          documentId: identifierValue,
          status: 'ACTIVE',
        },
      });
    } else if (identifierType === 'userId') {
      user = await prisma.user.findFirst({
        where: {
          id: parseInt(identifierValue, 10),
          status: 'ACTIVE',
        },
      });
    } else {
      throw new Error('Tipo de identificador no valido.');
    }

    if (!user) throw new Error('Usuario no activo o no encontrado.');

    if (session.cycleId) {
      const enrollment = await prisma.cycleEnrollment.findUnique({
        where: {
          userId_cycleId: {
            userId: user.id,
            cycleId: session.cycleId,
          },
        },
      });

      if (!enrollment) {
        throw new Error('El estudiante no pertenece al ciclo activo de la sesion.');
      }
    }

    const existingRecord = await prisma.attendanceRecord.findFirst({
      where: {
        userId: user.id,
        sessionId: parsedSessionId,
      },
    });

if (existingRecord) {
      if (existingRecord.status !== normalizedStatus) {
        const updatedRecord = await prisma.attendanceRecord.update({
          where: { id: existingRecord.id },
          data: { status: normalizedStatus, timestamp: new Date() },
        });
        return { record: updatedRecord, message: 'Estado de asistencia actualizado.' };
      }

      return {
        record: existingRecord,
        message: 'La asistencia para este usuario ya fue registrada en esta sesion.',
      };
    }

    const newRecord = await prisma.attendanceRecord.create({
      data: {
        userId: user.id,
        sessionId: parsedSessionId,
        status: normalizedStatus,
      },
    });

    return { record: newRecord, message: 'Asistencia registrada exitosamente.' };
  },

  getAttendanceHistoryForUser: async (userId) => {
    const parsedUserId = parseInt(userId, 10);

    if (Number.isNaN(parsedUserId)) {
      throw new Error('ID de usuario invalido.');
    }

    const records = await prisma.attendanceRecord.findMany({
      where: {
        userId: parsedUserId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        session: {
          include: {
            cycle: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return records.map(mapAttendanceHistoryRecord);
  },

  getAttendanceHistoryForStudentInCycle: async (studentId, cycleId) => {
    const parsedStudentId = parseInt(studentId, 10);
    const parsedCycleId = parseCycleId(cycleId);

    if (Number.isNaN(parsedStudentId)) {
      throw new Error('ID de estudiante invalido.');
    }

    const student = await prisma.user.findUnique({
      where: { id: parsedStudentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        documentId: true,
        role: {
          select: { name: true },
        },
      },
    });

    if (!student || student.role?.name !== 'student') {
      throw new Error('Estudiante no encontrado.');
    }

    const enrollment = await prisma.cycleEnrollment.findUnique({
      where: {
        userId_cycleId: {
          userId: parsedStudentId,
          cycleId: parsedCycleId,
        },
      },
    });

    if (!enrollment) {
      throw new Error('El estudiante no pertenece al ciclo activo.');
    }

    const records = await prisma.attendanceRecord.findMany({
      where: {
        userId: parsedStudentId,
        session: {
          cycleId: parsedCycleId,
        },
      },
      orderBy: [
        {
          session: {
            StartTime: 'desc',
          },
        },
        {
          timestamp: 'desc',
        },
      ],
      include: {
        session: {
          include: {
            cycle: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        documentId: student.documentId,
      },
      records: records.map(mapAttendanceHistoryRecord),
    };
  },

  endSession: async (sessionId, cycleId) => {
    await ensureSessionInCycle(sessionId, cycleId);

    return prisma.attendanceSession.update({
      where: { id: parseSessionId(sessionId) },
      data: { endTime: new Date() },
    });
  },

  deleteSession: async (sessionId, cycleId) => {
    const session = await ensureSessionInCycle(sessionId, cycleId);
    const parsedSessionId = parseSessionId(sessionId);

    if (session.endTime) {
      throw new Error('Solo se pueden eliminar sesiones en curso.');
    }

    await prisma.$transaction([
      prisma.attendanceRecord.deleteMany({
        where: { sessionId: parsedSessionId },
      }),
      prisma.attendanceSession.delete({
        where: { id: parsedSessionId },
      }),
    ]);

    return { message: 'Sesion eliminada correctamente.' };
  },

  reopenSession: async (sessionId, cycleId) => {
    const parsedSessionId = parseSessionId(sessionId);
    const session = await ensureSessionInCycle(parsedSessionId, cycleId);

    if (!session.endTime) {
      throw new Error('Solo se pueden reaperturar sesiones finalizadas.');
    }

    return prisma.attendanceSession.update({
      where: { id: parsedSessionId },
      data: { endTime: null },
    });
  },

  exportAttendanceHistoryToExcel: async (studentId, cycleId) => {
    const parsedStudentId = parseInt(studentId, 10);
    const parsedCycleId = parseCycleId(cycleId);

    if (Number.isNaN(parsedStudentId)) {
      throw new Error('ID de estudiante invalido.');
    }

    const student = await prisma.user.findUnique({
      where: { id: parsedStudentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        documentId: true,
        role: { select: { name: true } },
      },
    });

    if (!student || student.role?.name !== 'student') {
      throw new Error('Estudiante no encontrado.');
    }

    const enrollment = await prisma.cycleEnrollment.findUnique({
      where: {
        userId_cycleId: { userId: parsedStudentId, cycleId: parsedCycleId },
      },
    });

    if (!enrollment) {
      throw new Error('El estudiante no pertenece al ciclo activo.');
    }

    const records = await prisma.attendanceRecord.findMany({
      where: {
        userId: parsedStudentId,
        session: { cycleId: parsedCycleId },
      },
      orderBy: [
        { session: { StartTime: 'asc' } },
        { timestamp: 'asc' },
      ],
      include: {
        session: {
          include: {
            cycle: { select: { id: true, name: true } },
          },
        },
      },
    });

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Asistencia');

    worksheet.mergeCells('A1:D1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Alumno: ${student.firstName} ${student.lastName} - DNI: ${student.documentId}`;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } };
    worksheet.getRow(1).height = 35;

    const headerRow = worksheet.addRow(['Fecha', 'Sesión', 'Estado', 'Hora de entrada']);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF475569' } },
        bottom: { style: 'thin', color: { argb: 'FF475569' } },
        left: { style: 'thin', color: { argb: 'FF475569' } },
        right: { style: 'thin', color: { argb: 'FF475569' } },
      };
    });

    const statusMap = { PRESENT: 'PRESENTE', LATE: 'TARDANZA', ABSENT: 'FALTA' };

    records.forEach((record) => {
      const sessionDate = record.session?.StartTime || record.timestamp;
      const formattedDate = sessionDate
        ? new Date(sessionDate).toLocaleDateString('es-PE', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : 'Sin fecha';

      const status = statusMap[record.status] || record.status;

      const entryTime =
        record.status === 'PRESENT' || record.status === 'LATE'
          ? new Date(record.timestamp).toLocaleTimeString('es-PE', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          : '';

      const dataRow = worksheet.addRow([
        formattedDate,
        record.session?.name || 'Sesión sin nombre',
        status,
        entryTime,
      ]);

      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF475569' } },
          bottom: { style: 'thin', color: { argb: 'FF475569' } },
          left: { style: 'thin', color: { argb: 'FF475569' } },
          right: { style: 'thin', color: { argb: 'FF475569' } },
        };
      });
    });

    worksheet.getColumn(1).width = 32;
    worksheet.getColumn(2).width = 38;
    worksheet.getColumn(3).width = 16;
    worksheet.getColumn(4).width = 16;

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer, fileName: `asistencia-${student.documentId}.xlsx` };
  },

  getPuzzleData: async (cycleId, filters = {}) => {
    const parsedCycleId = parseCycleId(cycleId);

    const modalityFilter = filters.modality && filters.modality !== 'ALL' ? filters.modality : undefined;
    const groupFilter = filters.group && filters.group !== 'ALL' ? filters.group : undefined;
    const sessionTypeFilter = filters.sessionType && filters.sessionType !== 'ALL' ? filters.sessionType : undefined;

    const allowedSchedules = sessionTypeFilter
      ? ({
          TURN_MANANA: ['TURNO_MANANA', 'TURNO_COMPLETO'],
          TURN_TARDE: ['TURNO_TARDE', 'TURNO_COMPLETO'],
          TURN_COMPLETO: ['TURNO_COMPLETO'],
        })[sessionTypeFilter]
      : null;

    const [enrollments, sessions] = await Promise.all([
      prisma.cycleEnrollment.findMany({
        where: {
          cycleId: parsedCycleId,
          user: {
            status: 'ACTIVE',
            role: { name: 'student' },
          },
        },
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              documentId: true,
              studentProfile: {
                select: {
                  modality: true,
                  group: true,
                  schedule: true,
                },
              },
            },
          },
        },
        orderBy: [
          { user: { lastName: 'asc' } },
          { user: { firstName: 'asc' } },
        ],
      }),
      prisma.attendanceSession.findMany({
        where: {
          cycleId: parsedCycleId,
          StartTime: {
            gte: filters.startDate ? new Date(filters.startDate) : undefined,
            lte: filters.endDate ? new Date(filters.endDate + 'T23:59:59.999Z') : undefined,
          },
        },
        orderBy: { StartTime: 'asc' },
        include: {
          records: {
            select: { userId: true, status: true },
          },
        },
      }),
    ]);

    const students = enrollments
      .map(({ user }) => user)
      .filter((user) => {
        const matchesModality = !modalityFilter || user.studentProfile?.modality === modalityFilter;
        const matchesGroup = !groupFilter || user.studentProfile?.group === groupFilter;
        const matchesSchedule = !allowedSchedules || allowedSchedules.includes(user.studentProfile?.schedule);
        return matchesModality && matchesGroup && matchesSchedule;
      });

    const mappedSessions = sessions.map((session) => ({
      id: session.id,
      name: session.name,
      startTime: session.StartTime,
      records: session.records.reduce((acc, record) => {
        acc[record.userId] = record.status;
        return acc;
      }, {}),
    }));

    return { students, sessions: mappedSessions };
  },

  exportPuzzleToExcel: async (cycleId, filters = {}) => {
    const { students, sessions } = await module.exports.getPuzzleData(cycleId, filters);

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rompecabeza');

    const dateKeys = [];
    const allColumnKeys = [];

    const sessionDates = {};
    sessions.forEach((s) => {
      const d = new Date(s.startTime);
      const dateKey = d.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      if (!sessionDates[dateKey]) sessionDates[dateKey] = [];
      sessionDates[dateKey].push(s);
    });

    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const dk = cursor.toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
      dateKeys.push(dk);
      cursor.setDate(cursor.getDate() + 1);
    }

    dateKeys.forEach((dk) => {
      const daySessions = sessionDates[dk] || [];
      if (daySessions.length === 0) {
        allColumnKeys.push({ dateKey: dk, sessionId: null, sessionName: '-' });
      } else {
        daySessions.forEach((s) => {
          allColumnKeys.push({ dateKey: dk, sessionId: s.id, sessionName: s.name || 'Sesion' });
        });
      }
    });

    const totalSubColumns = allColumnKeys.length;

    worksheet.mergeCells(1, 1, 1, totalSubColumns + 3);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Matriz de Asistencia — ${filters.startDate} al ${filters.endDate}`;
    titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } };
    worksheet.getRow(1).height = 35;
    for (let c = 2; c <= totalSubColumns + 3; c++) {
      worksheet.getCell(1, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF97316' } };
    }

    const dateHeaderRow = 2;
    let dateColCursor = 4;
    dateKeys.forEach((dk) => {
      const daySessions = sessionDates[dk] || [];
      const span = Math.max(1, daySessions.length);
      if (span > 1) {
        worksheet.mergeCells(dateHeaderRow, dateColCursor, dateHeaderRow, dateColCursor + span - 1);
      }
      const cell = worksheet.getCell(dateHeaderRow, dateColCursor);
      const d = new Date(dk + 'T00:00:00');
      cell.value = d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', timeZone: 'America/Lima' });
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF475569' } },
        bottom: { style: 'thin', color: { argb: 'FF475569' } },
        left: { style: 'thin', color: { argb: 'FF475569' } },
        right: { style: 'thin', color: { argb: 'FF475569' } },
      };
      for (let i = 0; i < span; i++) {
        const c2 = worksheet.getCell(dateHeaderRow, dateColCursor + i);
        if (c2 !== cell) {
          c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
          c2.border = {
            top: { style: 'thin', color: { argb: 'FF475569' } },
            bottom: { style: 'thin', color: { argb: 'FF475569' } },
            right: { style: 'thin', color: { argb: 'FF475569' } },
          };
        }
      }
      dateColCursor += span;
    });

    ['Apellidos', 'Nombres', 'Turno'].forEach((label, i) => {
      worksheet.mergeCells(dateHeaderRow, i + 1, dateHeaderRow + 1, i + 1);
      const cell = worksheet.getCell(dateHeaderRow, i + 1);
      cell.value = label;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF475569' } },
        bottom: { style: 'thin', color: { argb: 'FF475569' } },
        left: { style: 'thin', color: { argb: 'FF475569' } },
        right: { style: 'thin', color: { argb: 'FF475569' } },
      };
      const mergedCell = worksheet.getCell(dateHeaderRow + 1, i + 1);
      mergedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      mergedCell.border = {
        bottom: { style: 'thin', color: { argb: 'FF475569' } },
        left: { style: 'thin', color: { argb: 'FF475569' } },
        right: { style: 'thin', color: { argb: 'FF475569' } },
      };
    });

    worksheet.getRow(dateHeaderRow).height = 22;

    const sessionHeaderRow = 3;
    dateColCursor = 4;
    dateKeys.forEach((dk) => {
      const daySessions = sessionDates[dk] || [];
      if (daySessions.length === 0) {
        const cell = worksheet.getCell(sessionHeaderRow, dateColCursor);
        cell.value = '-';
        cell.font = { color: { argb: 'FF64748B' }, size: 9 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF475569' } },
          bottom: { style: 'thin', color: { argb: 'FF475569' } },
          left: { style: 'thin', color: { argb: 'FF475569' } },
          right: { style: 'thin', color: { argb: 'FF475569' } },
        };
        dateColCursor += 1;
      } else {
        daySessions.forEach((s) => {
          const cell = worksheet.getCell(sessionHeaderRow, dateColCursor);
          cell.value = s.name || 'Sesion';
          cell.font = { color: { argb: 'FF94A3B8' }, size: 9 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF475569' } },
            bottom: { style: 'thin', color: { argb: 'FF475569' } },
            right: { style: 'thin', color: { argb: 'FF475569' } },
          };
          dateColCursor += 1;
        });
      }
    });

    worksheet.getRow(sessionHeaderRow).height = 20;

    const studentRowStart = 4;
    const studentCellStyle = {
      font: { size: 10 },
      alignment: { vertical: 'middle' },
      border: {
        top: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'thin', color: { argb: 'FF334155' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } },
      },
    };

    const statusColors = {
      PRESENT: { fgColor: { argb: 'FF1A4730' }, font: { color: { argb: 'FF86EFAC' }, bold: true } },
      LATE: { fgColor: { argb: 'FF4A3520' }, font: { color: { argb: 'FFFCD34D' }, bold: true } },
      ABSENT: { fgColor: { argb: 'FF4A2020' }, font: { color: { argb: 'FFFCA5A5' }, bold: true } },
    };

    students.forEach((student, idx) => {
      const rowNum = studentRowStart + idx;

      [1, 2, 3].forEach((col) => {
        const cell = worksheet.getCell(rowNum, col);
        if (col === 1) cell.value = student.lastName;
        else if (col === 2) cell.value = student.firstName;
        else cell.value = student.studentProfile?.schedule || '';
        cell.font = { ...(col === 3 ? { size: 9 } : { bold: true, size: 10 }), color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.alignment = { vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF334155' } },
          bottom: { style: 'thin', color: { argb: 'FF334155' } },
          left: { style: 'thin', color: { argb: 'FF334155' } },
          right: { style: 'thin', color: { argb: 'FF334155' } },
        };
      });

      let colCursor = 4;
      dateKeys.forEach((dk) => {
        const daySessions = sessionDates[dk] || [];
        if (daySessions.length === 0) {
          const cell = worksheet.getCell(rowNum, colCursor);
          cell.value = '';
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF192A40' } };
          Object.assign(cell, studentCellStyle);
          colCursor += 1;
        } else {
          daySessions.forEach((session) => {
            const cell = worksheet.getCell(rowNum, colCursor);
            const status = session.records[student.id];
            if (status) {
              const colors = statusColors[status] || {};
              cell.value = status === 'PRESENT' ? 'P' : status === 'LATE' ? 'T' : 'F';
              cell.font = { ...colors.font, size: 11 };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: colors.fgColor };
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            } else {
              cell.value = '';
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF192A40' } };
            }
            Object.assign(cell, studentCellStyle);
            colCursor += 1;
          });
        }
      });
    });

    ['A', 'B', 'C'].forEach((col, i) => {
      worksheet.getColumn(col).width = [20, 20, 12][i];
    });
    for (let c = 4; c <= totalSubColumns + 3; c++) {
      worksheet.getColumn(c).width = 5;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return { buffer, fileName: `rompecabeza-${filters.startDate}-${filters.endDate}.xlsx` };
  },
};
