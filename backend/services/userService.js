const bcrypt = require('bcrypt');
const prisma = require('../utils/prismaClient');

const ADMIN_ROLES = ['admin', 'teacher', 'matriculador'];

const parseCycleId = (cycleId) => {
  const parsed = parseInt(cycleId, 10);
  if (Number.isNaN(parsed)) {
    throw new Error('Se requiere un ciclo activo válido.');
  }
  return parsed;
};

const parseSkip = (val) => {
  const n = parseInt(val, 10);
  return Number.isNaN(n) || n < 0 ? 0 : n;
};

const parseTake = (val, defaultLimit = 500) => {
  const n = parseInt(val, 10);
  return Number.isNaN(n) || n < 1 ? defaultLimit : Math.min(n, 1000);
};

const buildWhereClause = (filters = {}) => {
  const cycleId = parseCycleId(filters.cycleId);

  const where = {
    cycleId,
    user: {
      role: {
        name: 'student',
      },
    },
  };

  const splitMulti = (val) => {
    if (!val || typeof val !== 'string') return [];
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  };

  const modalities = splitMulti(filters.modality);
  const groups = splitMulti(filters.group);
  const schedules = splitMulti(filters.schedule);
  const statuses = splitMulti(filters.status);
  const debtStatuses = splitMulti(filters.debtStatus);

  if (modalities.length > 0 || groups.length > 0 || schedules.length > 0) {
    where.user.studentProfile = {};
    if (modalities.length === 1) {
      where.user.studentProfile.modality = modalities[0];
    } else if (modalities.length > 1) {
      where.user.studentProfile.modality = { in: modalities };
    }
    if (groups.length === 1) {
      where.user.studentProfile.group = groups[0];
    } else if (groups.length > 1) {
      where.user.studentProfile.group = { in: groups };
    }
    if (schedules.length === 1) {
      where.user.studentProfile.schedule = schedules[0];
    } else if (schedules.length > 1) {
      where.user.studentProfile.schedule = { in: schedules };
    }
  }

  if (statuses.length === 1) {
    where.user.status = statuses[0];
  } else if (statuses.length > 1) {
    where.user.status = { in: statuses };
  }

  let paymentAgreementWhere = null;

  if (debtStatuses.length === 1) {
    const val = debtStatuses[0];
    if (val === 'WITH_DEBT') {
      paymentAgreementWhere = { currentPendingAmount: { gt: 0 } };
    } else if (val === 'WITHOUT_DEBT') {
      paymentAgreementWhere = { currentPendingAmount: 0 };
    }
  }

  const agreementTypes = splitMulti(filters.agreementType);
  if (agreementTypes.length === 1) {
    paymentAgreementWhere = {
      ...(paymentAgreementWhere || {}),
      agreementType: agreementTypes[0],
    };
  } else if (agreementTypes.length > 1) {
    paymentAgreementWhere = {
      ...(paymentAgreementWhere || {}),
      agreementType: { in: agreementTypes },
    };
  }

  if (paymentAgreementWhere) {
    where.paymentAgreement = { is: paymentAgreementWhere };
  }

  const textFields = ['documentId', 'firstName', 'lastName', 'phone'];
  const userConditions = [];

  textFields.forEach((field) => {
    const textVal = filters[field]?.trim();
    const selected = splitMulti(filters[`${field}In`]);

    const fieldConditions = [];
    if (textVal) {
      fieldConditions.push({ [field]: { contains: textVal, mode: 'insensitive' } });
    }
    if (selected.length > 0) {
      fieldConditions.push({ [field]: { in: selected } });
    }
    if (fieldConditions.length > 0) {
      userConditions.push({ OR: fieldConditions });
    }
  });

  if (userConditions.length > 0) {
    where.user.AND = userConditions;
  }

  const profileTextFields = ['guardianName', 'guardianPhone', 'schoolOfOrigin'];
  const profileConditions = [];

  profileTextFields.forEach((field) => {
    const textVal = filters[field]?.trim();
    const selected = splitMulti(filters[`${field}In`]);

    const fieldConditions = [];
    if (textVal) {
      fieldConditions.push({ [field]: { contains: textVal, mode: 'insensitive' } });
    }
    if (selected.length > 0) {
      fieldConditions.push({ [field]: { in: selected } });
    }
    if (fieldConditions.length > 0) {
      profileConditions.push({ OR: fieldConditions });
    }
  });

  if (profileConditions.length > 0) {
    if (where.user.studentProfile) {
      where.user.studentProfile.AND = [
        ...(where.user.studentProfile.AND || []),
        ...profileConditions,
      ];
    } else {
      where.user.studentProfile = { AND: profileConditions };
    }
  }

  return where;
};

const mapEnrollmentToRow = (enrollment) => ({
  userId: enrollment.user.id,
  cycleEnrollmentId: enrollment.id,
  cycleName: enrollment.cycle.name,
  modality: enrollment.user.studentProfile?.modality || 'N/A',
  group: enrollment.user.studentProfile?.group || 'N/A',
  schedule: enrollment.user.studentProfile?.schedule || 'N/A',
  documentId: enrollment.user.documentId,
  firstName: enrollment.user.firstName,
  lastName: enrollment.user.lastName,
  status: enrollment.user.status,
  phone: enrollment.user.phone || 'N/A',
  guardianName: enrollment.user.studentProfile?.guardianName || 'N/A',
  guardianPhone: enrollment.user.studentProfile?.guardianPhone || 'N/A',
  schoolOfOrigin: enrollment.user.studentProfile?.schoolOfOrigin || 'N/A',
  agreementType: enrollment.paymentAgreement?.agreementType || null,
  currentPendingAmount:
    enrollment.paymentAgreement?.currentPendingAmount === undefined
      ? null
      : enrollment.paymentAgreement?.currentPendingAmount ?? null,
  debtLabel:
    enrollment.paymentAgreement?.currentPendingAmount === undefined
      ? 'SIN ACUERDO'
      : enrollment.paymentAgreement?.currentPendingAmount === null
        ? 'SIN ACUERDO'
        : `S/ ${Number(enrollment.paymentAgreement.currentPendingAmount).toFixed(2)}`,
});

const getCycleFilters = async (cycleId) => {
  const parsedCycleId = parseInt(cycleId, 10);

  const profiles = await prisma.studentProfile.findMany({
    where: {
      user: {
        cycleEnrollments: {
          some: {
            cycleId: parsedCycleId,
          },
        },
        role: { name: 'student' },
      },
    },
    select: {
      modality: true,
      group: true,
      schedule: true,
    },
    distinct: ['modality', 'group', 'schedule'],
  });

  const modalities = new Set();
  const groups = new Set();
  const schedules = new Set();

  for (const profile of profiles) {
    if (profile.modality) modalities.add(profile.modality);
    if (profile.group) groups.add(profile.group);
    if (profile.schedule) schedules.add(profile.schedule);
  }

  return {
    modalities: Array.from(modalities).sort(),
    groups: Array.from(groups).sort(),
    schedules: Array.from(schedules).sort(),
  };
};

const getAdminUsers = async (filters = {}) => {
  const { search, role, status } = filters;

  const where = {
    role: {
      name: { in: ADMIN_ROLES },
    },
  };

  if (role) {
    where.role.name = role;
  }

  if (status) {
    where.status = status;
  }

  if (search && typeof search === 'string' && search.trim()) {
    const term = search.trim();
    where.OR = [
      { documentId: { contains: term, mode: 'insensitive' } },
      { firstName: { contains: term, mode: 'insensitive' } },
      { lastName: { contains: term, mode: 'insensitive' } },
      { username: { contains: term, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      documentId: true,
      firstName: true,
      lastName: true,
      username: true,
      email: true,
      status: true,
      role: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      {
        role: {
          name: 'asc',
        },
      },
      {
        lastName: 'asc',
      },
    ],
  });

  return users.map(({ role, ...user }) => ({ ...user, roleName: role.name }));
};

const createUser = async (data) => {
  const {
    username,
    password,
    firstName,
    lastName,
    documentId,
    email,
    roleName,
    teacherProfile,
  } = data;

  if (!ADMIN_ROLES.includes(roleName)) {
    throw new Error('El rol seleccionado no es válido.');
  }

  if (!password || password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }

  return prisma.$transaction(async (tx) => {
    const existingUsername = await tx.user.findUnique({ where: { username } });
    if (existingUsername) {
      throw new Error('El nombre de usuario ya está registrado.');
    }

    const existingDocument = await tx.user.findUnique({ where: { documentId } });
    if (existingDocument) {
      throw new Error('El DNI ya está registrado.');
    }

    if (email) {
      const existingEmail = await tx.user.findFirst({ where: { email } });
      if (existingEmail) {
        throw new Error('El correo electrónico ya está registrado.');
      }
    }

    const role = await tx.role.findUnique({ where: { name: roleName } });
    if (!role) {
      throw new Error(`El rol '${roleName}' no es válido.`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await tx.user.create({
      data: {
        username,
        password: hashedPassword,
        firstName,
        lastName,
        documentId,
        email,
        roleId: role.id,
        mustChangePassword: true,
      },
    });

    if (roleName === 'teacher') {
      await tx.teacherProfile.create({
        data: {
          userId: user.id,
          startDate: new Date(),
          employmentStatus: teacherProfile?.employmentStatus || '',
          specialty: teacherProfile?.specialty || '',
          academicDegree: teacherProfile?.academicDegree || '',
        },
      });
    }

    return {
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      documentId: user.documentId,
      roleName,
    };
  });
};

const deactivateUser = async (id) => {
  return prisma.user.update({
    where: { id: parseInt(id, 10) },
    data: { status: 'RETIRED' },
  });
};

module.exports = {
  getAllUsers: async (filters = {}) => {
    const where = buildWhereClause(filters);
    const skip = parseSkip(filters.skip);
    const take = parseTake(filters.take, 500);

    const [enrollments, total] = await Promise.all([
      prisma.cycleEnrollment.findMany({
        where,
        skip,
        take,
        include: {
          cycle: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              documentId: true,
              firstName: true,
              lastName: true,
              status: true,
              phone: true,
              studentProfile: {
                select: {
                  modality: true,
                  group: true,
                  schedule: true,
                  guardianName: true,
                  guardianPhone: true,
                  schoolOfOrigin: true,
                },
              },
            },
          },
          paymentAgreement: {
            select: {
              currentPendingAmount: true,
              agreementType: true,
            },
          },
        },
        orderBy: [
          {
            user: {
              lastName: 'asc',
            },
          },
          {
            user: {
              firstName: 'asc',
            },
          },
        ],
      }),
      prisma.cycleEnrollment.count({ where }),
    ]);

    return {
      rows: enrollments.map(mapEnrollmentToRow),
      total,
      skip,
      take,
    };
  },

  updateUser: async (id, data) => {
    const { studentProfile, ...userData } = data;
    const parsedId = parseInt(id, 10);

    return prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: parsedId },
        data: userData,
      });

      if (studentProfile) {
        const existingProfile = await tx.studentProfile.findUnique({
          where: { userId: parsedId },
        });

        if (existingProfile) {
          await tx.studentProfile.update({
            where: { userId: parsedId },
            data: studentProfile,
          });
        } else {
          await tx.studentProfile.create({
            data: { ...studentProfile, userId: parsedId },
          });
        }
      }

      return updatedUser;
    });
  },

  deleteUser: async (id) => {
    return prisma.user.delete({
      where: { id: parseInt(id, 10) },
    });
  },

  getAdminUsers,
  createUser,
  deactivateUser,

  getCycleFilters,
};
