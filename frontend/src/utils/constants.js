// Este archivo centraliza las opciones para los formularios,
// basadas en los ENUMS del schema de Prisma.

export const ROLES = [
  { value: 'student', label: 'Estudiante' },
  { value: 'teacher', label: 'Docente' },
];

export const STUDENT_MODALITIES = [
  'PRE_U',
  'BECA_18',
  'SECUNDARIA',
  'PRIMARIA',
  'COAR',
  'PRIMERA_OPCION',
];

export const SCHEDULES = ['TURNO_MANANA', 'TURNO_TARDE', 'TURNO_COMPLETO'];

export const INVESTMENT_TYPES = ['POR_PARTES', 'MENSUALIDAD', 'UNO_SOLO'];
