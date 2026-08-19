// backend/services/scheduleService.js
const prisma = require('../utils/prismaClient');

module.exports = {
  createSchedule: async (scheduleData) => {
    const { sessions, ...mainData } = scheduleData;
    
    // Usar una transacción para asegurar la atomicidad
    return await prisma.classSchedule.create({
      data: {
        ...mainData,
        sessions: {
          create: sessions, // Crear las sesiones asociadas
        },
      },
      include: {
        sessions: true,
      },
    });
  },

  getSchedulesForUser: async (user) => {
    if (user.role === 'matriculador' || user.role === 'admin' || user.role === 'kami') {
      return await prisma.classSchedule.findMany({ include: { sessions: true } });
    }

    if (user.role === 'student') {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: user.id },
      });
      if (!studentProfile) return [];

      return await prisma.classSchedule.findMany({
        where: {
          modality: studentProfile.modality,
          group: studentProfile.group,
        },
        include: {
          sessions: true,
        },
      });
    }

    return []; // Para otros roles (ej. teacher) que no tienen acceso a la lista completa
  },

  getScheduleByIdForUser: async (scheduleId, user) => {
    const schedule = await prisma.classSchedule.findUnique({
      where: { id: parseInt(scheduleId) },
      include: {
        sessions: {
          include: {
            course: { select: { title: true } },
            teacher: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!schedule) {
      throw new Error('Horario no encontrado.');
    }

    // Autorización
    if (user.role === 'matriculador' || user.role === 'admin' || user.role === 'kami') {
      return schedule;
    }

    if (user.role === 'student') {
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: user.id },
      });
      if (studentProfile && schedule.modality === studentProfile.modality && schedule.group === studentProfile.group) {
        return schedule;
      }
    }
    
    throw new Error('Acceso denegado.');
  },
};
