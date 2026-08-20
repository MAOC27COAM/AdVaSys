const prisma = require('../utils/prismaClient');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs/promises');
const paymentService = require('./paymentService');
const { assertCycleIsOperable } = require('../utils/cyclePeriod');
const {
  normalizeEmail,
  normalizeStudentProfileData,
  normalizeUserData,
} = require('../utils/studentValidation');

const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

const stripSensitiveFields = (user) => {
  if (!user) return user;
  const { password, mustChangePassword, ...safe } = user;
  return safe;
};

async function readProfilePhoto(url) {
  if (!url) return null;
  try {
    const cleanPath = url.replace(/^\/uploads\//, '');
    return await fs.readFile(path.join(UPLOADS_DIR, cleanPath));
  } catch {
    return null;
  }
}

/**
 * Calcula el estado de pago de un estudiante basado en sus cuotas.
 * @param {object} cycleEnrollment - La matrícula del ciclo del estudiante.
 * @returns {string}
 */
const calculatePaymentStatus = (cycleEnrollment) => {
  if (!cycleEnrollment || !cycleEnrollment.paymentAgreement) {
    return 'SIN_ACUERDO';
  }

  const installments = cycleEnrollment.paymentAgreement.installments;
  if (!installments || installments.length === 0) {
    return 'SIN_CUOTAS';
  }

  const now = new Date();
  let hasOverdue = false;
  let allPaid = true;

  for (const installment of installments) {
    if (installment.status !== 'PAID') {
      allPaid = false;
      if (new Date(installment.dueDate) < now) {
        hasOverdue = true;
      }
    }
  }

  if (allPaid) return 'PAGADO';
  if (hasOverdue) return 'ATRASADO';
  return 'AL_DIA';
};

const findEmailInCycle = async (tx, email, cycleId, excludedUserId = null) => {
  if (!email) {
    return null;
  }

  return tx.cycleEnrollment.findFirst({
    where: {
      cycleId,
      user: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
        ...(excludedUserId ? { id: { not: excludedUserId } } : {}),
      },
    },
  });
};

const buildStudentCycleDetails = (student, cycleEnrollment = null) => ({
  id: student.id,
  documentId: student.documentId,
  firstName: student.firstName,
  lastName: student.lastName,
  email: student.email,
  phone: student.phone,
  address: student.address,
  profilePictureUrl: student.profilePictureUrl,
  status: student.status,
  studentProfile: student.studentProfile,
  cycleEnrollment: cycleEnrollment
    ? {
        id: cycleEnrollment.id,
        enrollmentDate: cycleEnrollment.enrollmentDate,
        cycleId: cycleEnrollment.cycleId,
        cycle: cycleEnrollment.cycle,
      }
    : null,
});

module.exports = {
  getAllStudentsForMatricula: async (cycleId, query = '') => {
    if (!cycleId) {
      throw new Error('Se requiere un ID de ciclo para obtener los estudiantes matriculados.');
    }

    const searchCondition = query
      ? {
          OR: [
            { documentId: { contains: query, mode: 'insensitive' } },
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
          ],
        }
      : {};

    const cycleEnrollments = await prisma.cycleEnrollment.findMany({
      where: {
        cycleId: parseInt(cycleId, 10),
        user: searchCondition,
      },
      include: {
        user: {
          include: {
            studentProfile: true,
          },
        },
        cycle: true,
        paymentAgreement: {
          include: {
            installments: true,
          },
        },
      },
      orderBy: {
        enrollmentDate: 'desc',
      },
    });

    return cycleEnrollments.map((enrollment) => {
      const user = enrollment.user;
      const paymentStatus = calculatePaymentStatus(enrollment);
      return {
        id: user.id,
        documentId: user.documentId,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        modality: user.studentProfile?.modality || 'N/A',
        group: user.studentProfile?.group || 'N/A',
        schedule: user.studentProfile?.schedule || 'N/A',
        paymentStatus,
      };
    });
  },

  enrollNewStudent: async (enrollmentData, receivedById, externalTx = null) => {
    const { userData, studentProfileData, cycleId, paymentAgreementData } = enrollmentData;

    const execute = externalTx
      ? (fn) => fn(externalTx)
      : (fn) => prisma.$transaction(fn);

    return execute(async (tx) => {
      const parsedCycleId = parseInt(cycleId, 10);
      if (Number.isNaN(parsedCycleId)) {
        throw new Error('El ciclo seleccionado es inválido.');
      }

      await assertCycleIsOperable(tx, parsedCycleId);

      const normalizedUserData = normalizeUserData(userData);
      const normalizedStudentProfileData = normalizeStudentProfileData(studentProfileData);
      const normalizedEmail = normalizeEmail(normalizedUserData.email);

      const existingUserByDni = await tx.user.findUnique({
        where: { documentId: normalizedUserData.documentId },
        include: {
          role: true,
          studentProfile: true,
        },
      });

      const existingUserByEmail = await findEmailInCycle(
        tx,
        normalizedEmail,
        parsedCycleId,
        existingUserByDni?.id || null
      );
      if (existingUserByEmail) {
        throw new Error('El correo ya está registrado en este ciclo.');
      }

      const studentRole = await tx.role.findUnique({ where: { name: 'student' } });
      if (!studentRole) {
        throw new Error('El rol de estudiante no está definido en la base de datos.');
      }

      let targetUser = existingUserByDni;
      const reusedExistingStudent = Boolean(existingUserByDni);

      if (!targetUser) {
        const hashedPassword = await bcrypt.hash(normalizedUserData.documentId, 10);
        targetUser = await tx.user.create({
          data: {
            ...normalizedUserData,
            username: normalizedUserData.documentId,
            password: hashedPassword,
            mustChangePassword: false,
            roleId: studentRole.id,
          },
          include: {
            role: true,
            studentProfile: true,
          },
        });
      } else {
        if (targetUser.role?.name !== 'student') {
          throw new Error('El DNI pertenece a un usuario que no es estudiante.');
        }

        const existingEnrollment = await tx.cycleEnrollment.findUnique({
          where: {
            userId_cycleId: {
              userId: targetUser.id,
              cycleId: parsedCycleId,
            },
          },
        });

        if (existingEnrollment) {
          throw new Error('El estudiante ya está matriculado en este ciclo.');
        }

        targetUser = await tx.user.update({
          where: { id: targetUser.id },
          data: {
            firstName: normalizedUserData.firstName,
            lastName: normalizedUserData.lastName,
            email: normalizedEmail,
            phone: normalizedUserData.phone || null,
            address: normalizedUserData.address || null,
            profilePictureUrl: normalizedUserData.profilePictureUrl || null,
            status: 'ACTIVE',
          },
          include: {
            role: true,
            studentProfile: true,
          },
        });
      }

      if (targetUser.studentProfile) {
        await tx.studentProfile.update({
          where: { userId: targetUser.id },
          data: normalizedStudentProfileData,
        });
      } else {
        await tx.studentProfile.create({
          data: {
            ...normalizedStudentProfileData,
            userId: targetUser.id,
          },
        });
      }

      const cycleEnrollment = await tx.cycleEnrollment.create({
        data: {
          userId: targetUser.id,
          cycleId: parsedCycleId,
        },
      });

      await paymentService.createPaymentAgreementForEnrollment(tx, {
        cycleEnrollmentId: cycleEnrollment.id,
        paymentAgreementData,
        receivedById,
      });

      return {
        user: stripSensitiveFields(targetUser),
        cycleEnrollmentId: cycleEnrollment.id,
        reusedExistingStudent,
      };
    });
  },

  getStudentFullDetails: async (id, cycleId = null) => {
    try {
      const parsedId = parseInt(id, 10);
      const parsedCycleId = cycleId ? parseInt(cycleId, 10) : null;

      const includeEnrollments = {
        cycleEnrollments: {
          include: {
            cycle: true,
          },
          take: 1,
          orderBy: { enrollmentDate: 'desc' },
          ...(parsedCycleId ? { where: { cycleId: parsedCycleId } } : {}),
        },
      };

      const student = await prisma.user.findUnique({
        where: { id: parsedId },
        include: {
          studentProfile: true,
          role: {
            select: { name: true },
          },
          ...includeEnrollments,
        },
      });

      if (!student) {
        return null;
      }

      const cycleEnrollment = student.cycleEnrollments?.[0] || null;
      return buildStudentCycleDetails(student, cycleEnrollment);
    } catch (error) {
      console.error('Error en Prisma:', error);
      throw error;
    }
  },

  getStudentAcademicCardData: async (id, cycleId) => {
    const parsedId = parseInt(id, 10);
    const parsedCycleId = parseInt(cycleId, 10);

    if (Number.isNaN(parsedId) || Number.isNaN(parsedCycleId)) {
      throw new Error('Los datos del estudiante o ciclo son inválidos.');
    }

    const student = await prisma.user.findUnique({
      where: { id: parsedId },
      include: {
        role: true,
        studentProfile: true,
        cycleEnrollments: {
          where: { cycleId: parsedCycleId },
          include: {
            cycle: true,
          },
          take: 1,
        },
      },
    });

    if (!student || student.role?.name !== 'student') {
      throw new Error('Estudiante no encontrado.');
    }

    const activeEnrollment = student.cycleEnrollments?.[0];
    if (!activeEnrollment) {
      throw new Error('El estudiante no está matriculado en el ciclo activo.');
    }

    const cardData = {
      id: student.id,
      documentId: student.documentId,
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      phone: student.phone || '',
      profilePictureUrl: student.profilePictureUrl || '',
      modality: student.studentProfile?.modality || '',
      group: student.studentProfile?.group || '',
      cycleName: activeEnrollment.cycle?.name || '',
      cycleId: activeEnrollment.cycleId,
    };

    cardData.photoBuffer = await readProfilePhoto(cardData.profilePictureUrl);

    return cardData;
  },

  getStudentsAcademicCardDataBatch: async (studentIds, cycleId) => {
    const parsedCycleId = parseInt(cycleId, 10);
    if (Number.isNaN(parsedCycleId)) {
      throw new Error('El ciclo seleccionado es inválido.');
    }

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw new Error('Debes seleccionar al menos un estudiante.');
    }

    const normalizedIds = [...new Set(studentIds.map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id)))];
    if (normalizedIds.length === 0) {
      throw new Error('La selección de estudiantes es inválida.');
    }

    const students = await prisma.user.findMany({
      where: {
        id: { in: normalizedIds },
        role: { name: 'student' },
      },
      include: {
        role: true,
        studentProfile: true,
        cycleEnrollments: {
          where: { cycleId: parsedCycleId },
          include: {
            cycle: true,
          },
          take: 1,
        },
      },
    });

    if (students.length !== normalizedIds.length) {
      throw new Error('Uno o más estudiantes seleccionados no existen.');
    }

    const cardDataById = new Map();

    for (const student of students) {
      const activeEnrollment = student.cycleEnrollments?.[0];
      if (!activeEnrollment) {
        throw new Error('Uno o más estudiantes no están matriculados en el ciclo activo.');
      }

      cardDataById.set(student.id, {
        id: student.id,
        documentId: student.documentId,
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        phone: student.phone || '',
        profilePictureUrl: student.profilePictureUrl || '',
        modality: student.studentProfile?.modality || '',
        group: student.studentProfile?.group || '',
        cycleName: activeEnrollment.cycle?.name || '',
        cycleId: activeEnrollment.cycleId,
      });
    }

    const cards = normalizedIds.map((id) => cardDataById.get(id));

    const photoBuffers = await Promise.all(
      cards.map((card) => readProfilePhoto(card.profilePictureUrl))
    );
    cards.forEach((card, i) => {
      card.photoBuffer = photoBuffers[i];
    });

    return cards;
  },

  updateStudent: async (id, updateData) => {
    const { userData, studentProfileData, cycleId } = updateData;
    const userId = parseInt(id, 10);

    return prisma.$transaction(async (tx) => {
      const parsedCycleId = parseInt(cycleId, 10);
      if (Number.isNaN(parsedCycleId)) {
        throw new Error('El ciclo seleccionado es inválido.');
      }

      await assertCycleIsOperable(tx, parsedCycleId);

      const existingUser = await tx.user.findUnique({ where: { id: userId } });
      if (!existingUser) {
        throw new Error('El estudiante no existe.');
      }

      const existingEnrollment = await tx.cycleEnrollment.findUnique({
        where: {
          userId_cycleId: {
            userId,
            cycleId: parsedCycleId,
          },
        },
      });

      if (!existingEnrollment) {
        throw new Error('El estudiante no está matriculado en el ciclo activo.');
      }

      const normalizedUserData = normalizeUserData(userData);
      const normalizedStudentProfileData = normalizeStudentProfileData(studentProfileData);
      const normalizedEmail = normalizeEmail(normalizedUserData.email);

      const existingUserByEmail = await findEmailInCycle(
        tx,
        normalizedEmail,
        parsedCycleId,
        userId
      );
      if (existingUserByEmail) {
        throw new Error('El correo ya está registrado en este ciclo.');
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          firstName: normalizedUserData.firstName,
          lastName: normalizedUserData.lastName,
          email: normalizedEmail,
          phone: normalizedUserData.phone || null,
          address: normalizedUserData.address || null,
          profilePictureUrl: normalizedUserData.profilePictureUrl || null,
        },
      });

      await tx.studentProfile.updateMany({
        where: { userId },
        data: {
          modality: normalizedStudentProfileData.modality,
          schedule: normalizedStudentProfileData.schedule,
          age: normalizedStudentProfileData.age,
          schoolOfOrigin: normalizedStudentProfileData.schoolOfOrigin,
          guardianName: normalizedStudentProfileData.guardianName,
          guardianPhone: normalizedStudentProfileData.guardianPhone,
          group: normalizedStudentProfileData.group,
          section: normalizedStudentProfileData.section,
        },
      });

      return stripSensitiveFields(updatedUser);
    });
  },

  searchStudents: async (query, cycleId) => {
    if (!cycleId) {
      throw new Error('Se requiere un ID de ciclo para buscar estudiantes matriculados.');
    }

    const cycleEnrollments = await prisma.cycleEnrollment.findMany({
      where: {
        cycleId: parseInt(cycleId, 10),
        user: {
          OR: [
            {
              documentId: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              firstName: {
                contains: query,
                mode: 'insensitive',
              },
            },
            {
              lastName: {
                contains: query,
                mode: 'insensitive',
              },
            },
          ],
        },
      },
      include: {
        user: {
          include: {
            studentProfile: true,
          },
        },
        cycle: true,
        paymentAgreement: {
          include: {
            installments: true,
          },
        },
      },
      orderBy: {
        enrollmentDate: 'desc',
      },
    });

    return cycleEnrollments.map((enrollment) => {
      const user = enrollment.user;
      const paymentStatus = calculatePaymentStatus(enrollment);

      return {
        id: user.id,
        documentId: user.documentId,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        modality: user.studentProfile?.modality || 'N/A',
        group: user.studentProfile?.group || 'N/A',
        schedule: user.studentProfile?.schedule || 'N/A',
        enrollmentDate: enrollment.enrollmentDate,
        paymentStatus,
      };
    });
  },
};
