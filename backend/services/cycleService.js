const prisma = require('../utils/prismaClient');
const paymentService = require('./paymentService');
const { assertCycleIsOperable } = require('../utils/cyclePeriod');

module.exports = {
  // --- Gestión de Ciclos ---

  // Crear un nuevo ciclo
  createCycle: async (cycleData) => {
    const { name, startDate, endDate, status } = cycleData;
    
    // Asegurarse de que las fechas se conviertan a objetos Date
    const dataToSave = {
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status,
    };
    
    return await prisma.cycle.create({ data: dataToSave });
  },

  // Obtener todos los ciclos
  getAllCycles: async () => {
    return await prisma.cycle.findMany({
      orderBy: { startDate: 'desc' },
    });
  },

  // Obtener un ciclo por ID
  getCycleById: async (id) => {
    return await prisma.cycle.findUnique({ where: { id: parseInt(id) } });
  },

  // Actualizar un ciclo
  updateCycle: async (id, cycleData) => {
    const { name, startDate, endDate, status } = cycleData;
    
    // Crear un objeto solo con los campos que se van a actualizar
    const dataToUpdate = {};
    if (name) dataToUpdate.name = name;
    if (startDate) dataToUpdate.startDate = new Date(startDate);
    if (endDate) dataToUpdate.endDate = new Date(endDate);
    if (status) dataToUpdate.status = status;
    
    return await prisma.cycle.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
    });
  },

  // Eliminar un ciclo
  deleteCycle: async (id) => {
    // Considerar la eliminación en cascada de CycleEnrollments y PaymentAgreements/Installments
    // Prisma maneja esto si se configura onDelete en el schema.prisma
    return await prisma.cycle.delete({ where: { id: parseInt(id) } });
  },

  // --- Gestión de Matrículas en Ciclos ---

  // Matricular un estudiante en un ciclo
  enrollStudentInCycle: async (userId, cycleId, paymentAgreementData, receivedById = userId) => {
    return await prisma.$transaction(async (tx) => {
      await assertCycleIsOperable(tx, cycleId);

      // 1. Verificar que el estudiante y el ciclo existan
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('Usuario no encontrado.');
      const cycle = await tx.cycle.findUnique({ where: { id: cycleId } });
      if (!cycle) throw new Error('Ciclo no encontrado.');

      // 2. Verificar si el estudiante ya está matriculado en este ciclo
      const existingEnrollment = await tx.cycleEnrollment.findUnique({
        where: { userId_cycleId: { userId, cycleId } },
      });
      if (existingEnrollment) throw new Error('El estudiante ya está matriculado en este ciclo.');

      // 3. Crear la matrícula en el ciclo
      const cycleEnrollment = await tx.cycleEnrollment.create({
        data: {
          userId,
          cycleId,
        },
      });

      await paymentService.createPaymentAgreementForEnrollment(tx, {
        cycleEnrollmentId: cycleEnrollment.id,
        paymentAgreementData,
        receivedById,
      });

      return cycleEnrollment;
    });
  },

  // Obtener todas las matrículas de un ciclo específico
  getCycleEnrollments: async (cycleId) => {
    return await prisma.cycleEnrollment.findMany({
      where: { cycleId: parseInt(cycleId) },
      include: {
        user: {
          select: { id: true, username: true, firstName: true, lastName: true, email: true, documentId: true, profilePictureUrl: true },
        },
        paymentAgreement: {
          include: { installments: true },
        },
      },
    });
  },

  // Obtener una matrícula de ciclo específica por ID
  getCycleEnrollmentById: async (id) => {
    return await prisma.cycleEnrollment.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: { id: true, username: true, firstName: true, lastName: true, email: true, documentId: true, profilePictureUrl: true },
        },
        cycle: true,
        paymentAgreement: {
          include: { installments: true },
        },
      },
    });
  },

  // Actualizar una matrícula de ciclo (ej. actualizar el acuerdo de pago)
  updateCycleEnrollment: async (id, data) => {
    const enrollmentId = parseInt(id);
    const { paymentAgreementData, ...enrollmentData } = data;

    return await prisma.$transaction(async (tx) => {
      const existingEnrollment = await tx.cycleEnrollment.findUnique({
        where: { id: enrollmentId },
      });

      if (!existingEnrollment) {
        throw new Error('Matrícula de ciclo no encontrada.');
      }

      await assertCycleIsOperable(tx, existingEnrollment.cycleId);

      const updatedEnrollment = await tx.cycleEnrollment.update({
        where: { id: enrollmentId },
        data: enrollmentData,
      });

      if (paymentAgreementData) {
        const { installments, ...agreementData } = paymentAgreementData;

        // Actualizar o crear el PaymentAgreement
        let paymentAgreement = await tx.paymentAgreement.findUnique({ where: { cycleEnrollmentId: enrollmentId } });

        if (paymentAgreement) {
          paymentAgreement = await tx.paymentAgreement.update({
            where: { id: paymentAgreement.id },
            data: agreementData,
          });
        } else {
          paymentAgreement = await tx.paymentAgreement.create({
            data: {
              ...agreementData,
              cycleEnrollmentId: enrollmentId,
            },
          });
        }

        // Actualizar o crear cuotas de pago
        if (installments && installments.length > 0) {
          // Eliminar cuotas antiguas y crear nuevas para simplificar la lógica de actualización
          await tx.paymentInstallment.deleteMany({ where: { paymentAgreementId: paymentAgreement.id } });
          const installmentData = installments.map(inst => ({
            ...inst,
            dueDate: new Date(inst.dueDate),
            paymentAgreementId: paymentAgreement.id,
          }));
          await tx.paymentInstallment.createMany({ data: installmentData });
        }
      }

      return updatedEnrollment;
    });
  },

  // Eliminar una matrícula de ciclo
  deleteCycleEnrollment: async (id) => {
    // La eliminación en cascada de PaymentAgreement y PaymentInstallment debe estar configurada en schema.prisma
    return await prisma.cycleEnrollment.delete({ where: { id: parseInt(id) } });
  },

  // --- Gestión de Cuotas de Pago (para actualizar estado, etc.) ---

  // Obtener una cuota de pago por ID
  getPaymentInstallmentById: async (id) => {
    return await prisma.paymentInstallment.findUnique({ where: { id: parseInt(id) } });
  },

  // Actualizar el estado de una cuota de pago
  updatePaymentInstallmentStatus: async (id, status, paidAt = new Date()) => {
    return await prisma.paymentInstallment.update({
      where: { id: parseInt(id) },
      data: { status, paidAt },
    });
  },

  // Obtener todas las cuotas de un acuerdo de pago
  getInstallmentsByAgreementId: async (agreementId) => {
    return await prisma.paymentInstallment.findMany({
      where: { paymentAgreementId: parseInt(agreementId) },
      orderBy: { dueDate: 'asc' },
    });
  },
};
