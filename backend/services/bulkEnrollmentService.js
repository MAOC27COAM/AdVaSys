const XLSX = require('xlsx');
const prisma = require('../utils/prismaClient');
const studentService = require('./studentService');
const paymentService = require('./paymentService');
const { assertCycleIsOperable } = require('../utils/cyclePeriod');
const {
  normalizeEmail,
  normalizeStudentProfileData,
  normalizeUserData,
  trimToNull,
  validateOptionalNumericField,
} = require('../utils/studentValidation');

const EXPECTED_COLUMNS = [
  'dni',
  'nombres',
  'apellidos',
  'correo',
  'celular',
  'direccion',
  'modalidad',
  'grupo',
  'turno',
  'seccion',
  'edad',
  'colegio',
  'apoderado',
  'celular_apoderado',
  'monto_total',
  'monto_inicial',
  'numero_recibo',
];

const MODALITY_MAP = {
  'PRE U': 'PRE_U',
  PREU: 'PRE_U',
  PRE_U: 'PRE_U',
  'PRE-U': 'PRE_U',
  SECUNDARIA: 'SECUNDARIA',
  'PRIMERA OPCION': 'PRIMERA_OPCION',
  PRIMERA_OPCION: 'PRIMERA_OPCION',
  COAR: 'COAR',
  'BECA 18': 'BECA_18',
  BECA_18: 'BECA_18',
  PRIMARIA: 'PRIMARIA',
};

const SCHEDULE_MAP = {
  'TURNO MANANA': 'TURNO_MANANA',
  'TURNO MAÑANA': 'TURNO_MANANA',
  TURNO_MANANA: 'TURNO_MANANA',
  MANANA: 'TURNO_MANANA',
  MAÑANA: 'TURNO_MANANA',
  'TURNO TARDE': 'TURNO_TARDE',
  TURNO_TARDE: 'TURNO_TARDE',
  TARDE: 'TURNO_TARDE',
  'TURNO COMPLETO': 'TURNO_COMPLETO',
  TURNO_COMPLETO: 'TURNO_COMPLETO',
  COMPLETO: 'TURNO_COMPLETO',
};

const GROUPS = new Set(['A', 'B', 'C', 'D', 'E']);

const normalizeHeader = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const parseWorksheet = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('El archivo Excel no contiene hojas.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    blankrows: false,
    defval: '',
  });

  if (rows.length < 2) {
    throw new Error('El archivo Excel no contiene registros para importar.');
  }

  const headers = rows[0].map(normalizeHeader);
  const missingColumns = EXPECTED_COLUMNS.filter((column) => !headers.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`Faltan columnas requeridas: ${missingColumns.join(', ')}.`);
  }

  const dataRows = rows.slice(1).map((values, index) => {
    const entry = {};
    headers.forEach((header, headerIndex) => {
      entry[header] = values[headerIndex];
    });

    return {
      rowNumber: index + 2,
      raw: entry,
    };
  }).filter((entry) => Object.values(entry.raw).some((value) => trimToNull(value) !== null));

  if (dataRows.length === 0) {
    throw new Error('El archivo Excel no contiene registros validos para importar.');
  }

  return dataRows;
};

const normalizeModality = (value) => {
  const normalized = normalizeHeader(value).toUpperCase();
  const cleaned = normalized.replace(/_/g, ' ');
  const match = MODALITY_MAP[normalized] || MODALITY_MAP[cleaned];
  if (!match) {
    throw new Error('Modalidad invalida.');
  }
  return match;
};

const normalizeSchedule = (value) => {
  const normalized = normalizeHeader(value).toUpperCase();
  const cleaned = normalized.replace(/_/g, ' ');
  const match = SCHEDULE_MAP[normalized] || SCHEDULE_MAP[cleaned];
  if (!match) {
    throw new Error('Turno invalido.');
  }
  return match;
};

const normalizeGroup = (value) => {
  const normalized = trimToNull(value)?.toUpperCase() || null;
  if (!normalized || !GROUPS.has(normalized)) {
    throw new Error('Grupo invalido.');
  }
  return normalized;
};

const parseOptionalAge = (value) => {
  const normalized = trimToNull(value);
  if (!normalized) {
    return null;
  }

  const parsed = parseInt(normalized, 10);
  if (Number.isNaN(parsed)) {
    throw new Error('La edad debe ser numerica.');
  }

  return parsed;
};

const parseAmount = (value, label, { required = false } = {}) => {
  const normalized = trimToNull(value);

  if (!normalized) {
    if (required) {
      throw new Error(`${label} es obligatorio.`);
    }
    return '';
  }

  const sanitized = String(normalized).replace(/,/g, '.');
  const parsed = parseFloat(sanitized);
  if (Number.isNaN(parsed)) {
    throw new Error(`${label} invalido.`);
  }

  return parsed;
};

const normalizeImportRow = (raw) => {
  const userData = normalizeUserData({
    firstName: raw.nombres,
    lastName: raw.apellidos,
    email: raw.correo,
    documentId: raw.dni,
    phone: validateOptionalNumericField(raw.celular, 'El celular') || '',
    address: raw.direccion,
    profilePictureUrl: '',
  });

  const studentProfileData = normalizeStudentProfileData({
    modality: normalizeModality(raw.modalidad),
    schedule: normalizeSchedule(raw.turno),
    age: parseOptionalAge(raw.edad),
    schoolOfOrigin: raw.colegio,
    guardianName: raw.apoderado,
    guardianPhone: raw.celular_apoderado,
    group: normalizeGroup(raw.grupo),
    section: trimToNull(raw.seccion),
  });

  const paymentAgreementData = {
    receiptNumber: trimToNull(raw.numero_recibo) || '',
    totalAmount: parseAmount(raw.monto_total, 'El monto total', { required: true }),
    initialPaymentAmount: parseAmount(raw.monto_inicial, 'El monto inicial') || '',
    agreementType: 'SINGLE_PAYMENT',
    installments: [],
  };

  paymentService.validatePaymentAgreementData(paymentAgreementData);

  return {
    userData,
    studentProfileData,
    paymentAgreementData,
  };
};

const buildCycleEmailLookup = async (cycleId) => {
  const enrollments = await prisma.cycleEnrollment.findMany({
    where: { cycleId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  const emailMap = new Map();
  enrollments.forEach((enrollment) => {
    const normalizedEmail = normalizeEmail(enrollment.user.email);
    if (normalizedEmail) {
      emailMap.set(normalizedEmail.toLowerCase(), enrollment.user.id);
    }
  });

  return emailMap;
};

const previewBulkEnrollment = async (buffer, cycleId) => {
  const parsedCycleId = parseInt(cycleId, 10);
  await assertCycleIsOperable(prisma, parsedCycleId);

  const parsedRows = parseWorksheet(buffer);
  const emailMap = await buildCycleEmailLookup(parsedCycleId);
  const duplicateDniTracker = new Set();
  const duplicateEmailTracker = new Set();

  const previewRows = [];
  let validRows = 0;
  let errorRows = 0;
  let newStudents = 0;
  let recurrentStudents = 0;

  for (const entry of parsedRows) {
    const { rowNumber, raw } = entry;

    try {
      const normalizedData = normalizeImportRow(raw);
      const normalizedDni = normalizedData.userData.documentId;
      const normalizedEmail = normalizeEmail(normalizedData.userData.email);

      if (duplicateDniTracker.has(normalizedDni)) {
        throw new Error('El DNI esta repetido dentro del mismo archivo.');
      }
      duplicateDniTracker.add(normalizedDni);

      if (normalizedEmail) {
        const emailKey = normalizedEmail.toLowerCase();
        if (duplicateEmailTracker.has(emailKey)) {
          throw new Error('El correo esta repetido dentro del mismo archivo.');
        }
        duplicateEmailTracker.add(emailKey);
      }

      const existingUser = await prisma.user.findUnique({
        where: { documentId: normalizedDni },
        include: {
          role: true,
        },
      });

      if (existingUser && existingUser.role?.name !== 'student') {
        throw new Error('El DNI pertenece a un usuario que no es estudiante.');
      }

      if (existingUser) {
        const existingEnrollment = await prisma.cycleEnrollment.findUnique({
          where: {
            userId_cycleId: {
              userId: existingUser.id,
              cycleId: parsedCycleId,
            },
          },
        });

        if (existingEnrollment) {
          throw new Error('El estudiante ya esta matriculado en este ciclo.');
        }
      }

      if (normalizedEmail) {
        const emailOwnerId = emailMap.get(normalizedEmail.toLowerCase());
        if (emailOwnerId && emailOwnerId !== existingUser?.id) {
          throw new Error('El correo ya esta registrado en este ciclo.');
        }
      }

      const studentType = existingUser ? 'RECURRENT' : 'NEW';
      const status = existingUser ? 'RECURRENT' : 'VALID';
      const message = existingUser
        ? 'Estudiante recurrente listo para matricular en el nuevo ciclo.'
        : 'Estudiante nuevo listo para importar.';

      validRows += 1;
      if (existingUser) {
        recurrentStudents += 1;
      } else {
        newStudents += 1;
      }

      previewRows.push({
        rowNumber,
        status,
        studentType,
        message,
        normalizedData,
      });
    } catch (error) {
      errorRows += 1;
      previewRows.push({
        rowNumber,
        status: 'ERROR',
        studentType: null,
        message: error.message,
        normalizedData: null,
      });
    }
  }

  return {
    summary: {
      totalRows: parsedRows.length,
      validRows,
      errorRows,
      newStudents,
      recurrentStudents,
    },
    rows: previewRows,
  };
};

const commitBulkEnrollment = async ({ cycleId, rows, receivedById }) => {
  const parsedCycleId = parseInt(cycleId, 10);
  await assertCycleIsOperable(prisma, parsedCycleId);

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('No hay filas validadas para importar.');
  }

  return prisma.$transaction(async (tx) => {
    let imported = 0;
    let recurrentImported = 0;

    for (const row of rows) {
      if (!row.normalizedData) {
        throw new Error(`Fila ${row.rowNumber || 0}: datos no validados.`);
      }

      const enrollmentPayload = {
        ...row.normalizedData,
        cycleId: parsedCycleId,
      };

      const result = await studentService.enrollNewStudent(enrollmentPayload, receivedById, tx);
      imported += 1;
      if (result.reusedExistingStudent) {
        recurrentImported += 1;
      }
    }

    return {
      summary: {
        processed: rows.length,
        imported,
        failed: 0,
        recurrentImported,
      },
    };
  });
};

module.exports = {
  previewBulkEnrollment,
  commitBulkEnrollment,
};
