const prisma = require('../utils/prismaClient');
const { assertCycleIsOperable } = require('../utils/cyclePeriod');
const { normalizeReceiptNumber, validateDocumentId } = require('../utils/studentValidation');
const { getLimaTimeLabel, groupByLimaDay } = require('../utils/dateGrouping');

const roundMoney = (value) => parseFloat(Number(value || 0).toFixed(2));

const parsePositiveInt = (value, label) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`${label} invalido.`);
  }
  return parsed;
};

const parseAmount = (value, label) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${label} invalido.`);
  }

  return parsed;
};

const buildInstallmentsData = (agreementType, installments, totalAmount, paymentAgreementId) => {
  if (Array.isArray(installments) && installments.length > 0) {
    return installments.map((installment) => ({
      dueDate: new Date(installment.dueDate),
      amount: parseFloat(installment.amount),
      paymentAgreementId,
    }));
  }

  if (agreementType === 'SINGLE_PAYMENT' && totalAmount > 0) {
    return [{
      dueDate: new Date(),
      amount: totalAmount,
      paymentAgreementId,
    }];
  }

  if (agreementType === 'MONTHLY_INSTALLMENTS' && totalAmount > 0) {
    const numMonths = 3;
    const monthlyAmount = parseFloat((totalAmount / numMonths).toFixed(2));

    return Array.from({ length: numMonths }, (_, index) => {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + index + 1);

      return {
        dueDate,
        amount: monthlyAmount,
        paymentAgreementId,
      };
    });
  }

  return [];
};

const validatePaymentAgreementData = (paymentAgreementData) => {
  if (!paymentAgreementData) {
    return null;
  }

  const totalAmount = parseAmount(paymentAgreementData.totalAmount, 'Monto total');
  const initialPaymentAmount = parseAmount(paymentAgreementData.initialPaymentAmount, 'Monto inicial') ?? 0;
  const agreementType = paymentAgreementData.agreementType;
  const receiptNumber = normalizeReceiptNumber(
    paymentAgreementData.receiptNumber || paymentAgreementData.numero_recibo || null
  );
  const installments = Array.isArray(paymentAgreementData.installments) ? paymentAgreementData.installments : [];

  if (totalAmount === null || totalAmount <= 0) {
    throw new Error('El monto total debe ser mayor que 0.');
  }

  if (!agreementType) {
    throw new Error('El tipo de acuerdo es obligatorio.');
  }

  if (initialPaymentAmount < 0) {
    throw new Error('El monto inicial no puede ser negativo.');
  }

  if (initialPaymentAmount > totalAmount) {
    throw new Error('El monto inicial no puede ser mayor al monto total.');
  }

  return {
    totalAmount,
    initialPaymentAmount,
    currentPendingAmount: parseFloat((totalAmount - initialPaymentAmount).toFixed(2)),
    agreementType,
    receiptNumber,
    installments,
  };
};

const createPaymentAgreementForEnrollment = async (tx, {
  cycleEnrollmentId,
  paymentAgreementData,
  receivedById,
}) => {
  const normalized = validatePaymentAgreementData(paymentAgreementData);

  if (!normalized) {
    return null;
  }

  const paymentAgreement = await tx.paymentAgreement.create({
    data: {
      totalAmount: normalized.totalAmount,
      agreementType: normalized.agreementType,
      initialPaymentAmount: normalized.initialPaymentAmount,
      currentPendingAmount: normalized.currentPendingAmount,
      cycleEnrollmentId,
    },
  });

  const installmentsData = buildInstallmentsData(
    normalized.agreementType,
    normalized.installments,
    normalized.totalAmount,
    paymentAgreement.id
  );

  if (installmentsData.length > 0) {
    await tx.paymentInstallment.createMany({ data: installmentsData });
  }

  if (normalized.initialPaymentAmount > 0) {
    await tx.paymentTransaction.create({
      data: {
        paymentAgreementId: paymentAgreement.id,
        amountPaid: normalized.initialPaymentAmount,
        remainingAmountAfterPayment: normalized.currentPendingAmount,
        receiptNumber: normalized.receiptNumber,
        paymentType: 'INITIAL_PAYMENT',
        description: 'Pago inicial registrado en matrícula',
        paidAt: new Date(),
        receivedById,
      },
    });
  }

  return paymentAgreement;
};

const getAgreementContextByDocument = async (documentId, cycleId) => {
  const parsedCycleId = parsePositiveInt(cycleId, 'ID de ciclo');
  const normalizedDocumentId = validateDocumentId(documentId);

  const enrollment = await prisma.cycleEnrollment.findFirst({
    where: {
      cycleId: parsedCycleId,
      user: {
        documentId: normalizedDocumentId,
      },
    },
    include: {
      user: {
        include: {
          studentProfile: true,
        },
      },
      paymentAgreement: {
        include: {
          installments: {
            orderBy: { dueDate: 'asc' },
          },
          transactions: {
            orderBy: { paidAt: 'desc' },
          },
        },
      },
    },
  });

  if (!enrollment) {
    throw new Error('El estudiante no está matriculado en el ciclo activo.');
  }

  if (!enrollment.paymentAgreement) {
    throw new Error('El estudiante no tiene un acuerdo de pago en el ciclo activo.');
  }

  return enrollment;
};

const getStudentPaymentSummary = async (documentId, cycleId) => {
  const enrollment = await getAgreementContextByDocument(documentId, cycleId);
  const { user, paymentAgreement } = enrollment;

  return {
    userId: user.id,
    documentId: user.documentId,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    modality: user.studentProfile?.modality || 'N/A',
    status: user.status,
    agreementType: paymentAgreement.agreementType,
    totalAmount: paymentAgreement.totalAmount,
    initialPaymentAmount: paymentAgreement.initialPaymentAmount,
    currentPendingAmount: paymentAgreement.currentPendingAmount,
    installmentsCount: paymentAgreement.installments.length,
    installments: paymentAgreement.installments.map((installment) => ({
      id: installment.id,
      dueDate: installment.dueDate,
      amount: installment.amount,
    })),
  };
};

const getPaymentHistory = async (documentId, cycleId) => {
  const enrollment = await getAgreementContextByDocument(documentId, cycleId);

  return enrollment.paymentAgreement.transactions.map((transaction) => ({
    id: transaction.id,
    documentId: enrollment.user.documentId,
    paidAt: transaction.paidAt,
    amountPaid: transaction.amountPaid,
    remainingAmountAfterPayment: transaction.remainingAmountAfterPayment,
    receiptNumber: transaction.receiptNumber,
    paymentType: transaction.paymentType,
    description: transaction.description,
  }));
};

const registerPayment = async ({
  documentId,
  cycleId,
  amountPaid,
  receiptNumber,
  receivedById,
}) => {
  const normalizedAmount = parseAmount(amountPaid, 'Monto pagado');

  if (normalizedAmount === null || normalizedAmount <= 0) {
    throw new Error('El monto pagado debe ser mayor que 0.');
  }

  return prisma.$transaction(async (tx) => {
    const parsedCycleId = parsePositiveInt(cycleId, 'ID de ciclo');
    const normalizedDocumentId = validateDocumentId(documentId);
    await assertCycleIsOperable(tx, parsedCycleId);

    const enrollment = await tx.cycleEnrollment.findFirst({
      where: {
        cycleId: parsedCycleId,
        user: {
          documentId: normalizedDocumentId,
        },
      },
      include: {
        user: true,
        paymentAgreement: true,
      },
    });

    if (!enrollment) {
      throw new Error('El estudiante no está matriculado en el ciclo activo.');
    }

    if (!enrollment.paymentAgreement) {
      throw new Error('El estudiante no tiene un acuerdo de pago en el ciclo activo.');
    }

    if (normalizedAmount > enrollment.paymentAgreement.currentPendingAmount) {
      throw new Error('El monto pagado no puede superar el saldo pendiente.');
    }

    const remainingAmount = parseFloat(
      (enrollment.paymentAgreement.currentPendingAmount - normalizedAmount).toFixed(2)
    );

    const transaction = await tx.paymentTransaction.create({
      data: {
        paymentAgreementId: enrollment.paymentAgreement.id,
        amountPaid: normalizedAmount,
        remainingAmountAfterPayment: remainingAmount,
        receiptNumber: normalizeReceiptNumber(receiptNumber),
        paymentType: 'REGULAR_PAYMENT',
        description: 'Pago registrado desde el módulo de pagos',
        receivedById,
      },
    });

    const updatedAgreement = await tx.paymentAgreement.update({
      where: { id: enrollment.paymentAgreement.id },
      data: {
        currentPendingAmount: remainingAmount,
      },
    });

    return {
      transaction,
      agreement: updatedAgreement,
    };
  });
};

const registerDiscount = async ({
  documentId,
  cycleId,
  discountAmount,
  receivedById,
}) => {
  const normalizedAmount = parseAmount(discountAmount, 'Monto del descuento');

  if (normalizedAmount === null || normalizedAmount <= 0) {
    throw new Error('El monto del descuento debe ser mayor que 0.');
  }

  return prisma.$transaction(async (tx) => {
    const parsedCycleId = parsePositiveInt(cycleId, 'ID de ciclo');
    const normalizedDocumentId = validateDocumentId(documentId);
    await assertCycleIsOperable(tx, parsedCycleId);

    const enrollment = await tx.cycleEnrollment.findFirst({
      where: {
        cycleId: parsedCycleId,
        user: {
          documentId: normalizedDocumentId,
        },
      },
      include: {
        user: true,
        paymentAgreement: true,
      },
    });

    if (!enrollment) {
      throw new Error('El estudiante no está matriculado en el ciclo activo.');
    }

    if (!enrollment.paymentAgreement) {
      throw new Error('El estudiante no tiene un acuerdo de pago en el ciclo activo.');
    }

    if (normalizedAmount > enrollment.paymentAgreement.currentPendingAmount) {
      throw new Error('El descuento no puede superar el saldo pendiente.');
    }

    const remainingAmount = parseFloat(
      (enrollment.paymentAgreement.currentPendingAmount - normalizedAmount).toFixed(2)
    );

    const transaction = await tx.paymentTransaction.create({
      data: {
        paymentAgreementId: enrollment.paymentAgreement.id,
        amountPaid: normalizedAmount,
        remainingAmountAfterPayment: remainingAmount,
        receiptNumber: null,
        paymentType: 'DISCOUNT',
        description: 'Descuento aplicado desde el módulo de pagos',
        receivedById,
      },
    });

    const updatedAgreement = await tx.paymentAgreement.update({
      where: { id: enrollment.paymentAgreement.id },
      data: {
        currentPendingAmount: remainingAmount,
      },
    });

    return {
      transaction,
      agreement: updatedAgreement,
    };
  });
};

const updateStudentStatus = async (userId, cycleId, status) => {
  const parsedUserId = parsePositiveInt(userId, 'ID de usuario');
  const parsedCycleId = parsePositiveInt(cycleId, 'ID de ciclo');

  if (!['ACTIVE', 'RETIRED'].includes(status)) {
    throw new Error('Estado de estudiante inválido.');
  }

  await assertCycleIsOperable(prisma, parsedCycleId);

  return prisma.user.update({
    where: { id: parsedUserId },
    data: { status },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      documentId: true,
      status: true,
    },
  });
};

const retireStudent = async (userId, cycleId) => updateStudentStatus(userId, cycleId, 'RETIRED');

const activateStudent = async (userId, cycleId) => updateStudentStatus(userId, cycleId, 'ACTIVE');

const getCyclePaymentSummary = async (cycleId) => {
  const parsedCycleId = parsePositiveInt(cycleId, 'ID de ciclo');

  const enrollments = await prisma.cycleEnrollment.findMany({
    where: { cycleId: parsedCycleId },
    include: {
      user: {
        select: {
          status: true,
        },
      },
      paymentAgreement: {
        select: {
          id: true,
          totalAmount: true,
          currentPendingAmount: true,
        },
      },
    },
  });

  const paidAmounts = await prisma.paymentTransaction.groupBy({
    by: ['paymentAgreementId'],
    where: {
      paymentAgreement: {
        cycleEnrollment: {
          cycleId: parsedCycleId,
        },
      },
    },
    _sum: {
      amountPaid: true,
    },
  });

  const paidMap = new Map(
    paidAmounts.map((p) => [p.paymentAgreementId, p._sum.amountPaid])
  );

  const discountData = await prisma.paymentTransaction.groupBy({
    by: ['paymentAgreementId'],
    where: {
      paymentType: 'DISCOUNT',
      paymentAgreement: {
        cycleEnrollment: {
          cycleId: parsedCycleId,
        },
      },
    },
    _sum: {
      amountPaid: true,
    },
  });

  const studentsWithDiscountCount = discountData.length;
  const totalDiscountAmount = discountData.reduce(
    (sum, d) => sum + (d._sum.amountPaid ?? 0),
    0
  );

  let activeCount = 0;
  let activeTotalToPay = 0;
  let activeTotalPaid = 0;
  let activeWithDebt = 0;
  let activeNoDebt = 0;
  let retiredCount = 0;
  let retiredTotalToPay = 0;
  let retiredTotalPaid = 0;
  let retiredWithDebt = 0;
  let retiredNoDebt = 0;
  let noDebtCount = 0;
  let noDebtPending = 0;
  let noDebtTotalPaid = 0;
  let withDebtCount = 0;
  let withDebtPending = 0;
  let withDebtTotalToPay = 0;
  let activePending = 0;
  let retiredPending = 0;

  for (const enrollment of enrollments) {
    const agreement = enrollment.paymentAgreement;
    const totalAmount = agreement?.totalAmount ?? 0;
    const pendingAmount = agreement?.currentPendingAmount ?? 0;
    const agreementId = agreement?.id;
    const totalPaid = agreementId ? (paidMap.get(agreementId) ?? 0) : 0;
    const status = enrollment.user.status;
    const isActive = status !== 'RETIRED';
    const hasDebt = pendingAmount > 0;

    if (isActive) {
      activeCount += 1;
      activeTotalToPay += totalAmount;
      activeTotalPaid += totalPaid;
      activePending += pendingAmount;
      if (hasDebt) {
        activeWithDebt += 1;
      } else {
        activeNoDebt += 1;
      }
    } else {
      retiredCount += 1;
      retiredTotalToPay += totalAmount;
      retiredTotalPaid += totalPaid;
      retiredPending += pendingAmount;
      if (hasDebt) {
        retiredWithDebt += 1;
      } else {
        retiredNoDebt += 1;
      }
    }

    if (pendingAmount === 0) {
      noDebtCount += 1;
      noDebtPending += pendingAmount;
      noDebtTotalPaid += totalPaid;
    } else {
      withDebtCount += 1;
      withDebtPending += pendingAmount;
      withDebtTotalToPay += totalAmount;
    }
  }

  return {
    activeStudentsCount: activeCount,
    activeStudentsTotalToPay: roundMoney(activeTotalToPay),
    activeStudentsTotalPaid: roundMoney(activeTotalPaid),
    activeStudentsPending: roundMoney(activePending),
    activeStudentsWithDebt: activeWithDebt,
    activeStudentsNoDebt: activeNoDebt,
    retiredStudentsCount: retiredCount,
    retiredStudentsTotalToPay: roundMoney(retiredTotalToPay),
    retiredStudentsTotalPaid: roundMoney(retiredTotalPaid),
    retiredStudentsPending: roundMoney(retiredPending),
    retiredStudentsWithDebt: retiredWithDebt,
    retiredStudentsNoDebt: retiredNoDebt,
    noDebtStudentsCount: noDebtCount,
    noDebtStudentsPending: roundMoney(noDebtPending),
    noDebtStudentsTotalPaid: roundMoney(noDebtTotalPaid),
    withDebtStudentsCount: withDebtCount,
    withDebtStudentsPending: roundMoney(withDebtPending),
    withDebtStudentsTotalToPay: roundMoney(withDebtTotalToPay),
    studentsWithDiscountCount,
    totalDiscountAmount: roundMoney(totalDiscountAmount),
  };
};

const getCyclePaymentHistory = async (cycleId) => {
  const parsedCycleId = parsePositiveInt(cycleId, 'ID de ciclo');

  const transactions = await prisma.paymentTransaction.findMany({
    where: {
      paymentAgreement: {
        cycleEnrollment: {
          cycleId: parsedCycleId,
        },
      },
    },
    include: {
      paymentAgreement: {
        include: {
          cycleEnrollment: {
            include: {
              user: {
                select: {
                  documentId: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
      receivedBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      paidAt: 'desc',
    },
  });

  const mappedTransactions = transactions.map((transaction) => {
    const student = transaction.paymentAgreement.cycleEnrollment.user;
    const receivedByName = transaction.receivedBy
      ? `${transaction.receivedBy.firstName} ${transaction.receivedBy.lastName}`.trim()
      : null;

    return {
      id: transaction.id,
      paidAt: transaction.paidAt,
      timeLabel: getLimaTimeLabel(transaction.paidAt),
      documentId: student.documentId,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      amountPaid: transaction.amountPaid,
      remainingAmountAfterPayment: transaction.remainingAmountAfterPayment,
      receiptNumber: transaction.receiptNumber,
      paymentType: transaction.paymentType,
      description: transaction.description,
      receivedByName,
    };
  });

  const groupedDays = groupByLimaDay(
    mappedTransactions,
    (transaction) => transaction.paidAt,
    (transaction) => transaction
  );

  const days = groupedDays.map((day) => ({
    date: day.date,
    displayDate: day.displayDate,
    subtotal: roundMoney(day.items.reduce((sum, item) => sum + item.amountPaid, 0)),
    transactions: day.items,
  }));

  return { days };
};

const searchStudentsForPayments = async (cycleId, query) => {
  const parsedCycleId = parsePositiveInt(cycleId, 'ID de ciclo');
  const normalizedQuery = query?.trim();

  if (!normalizedQuery || normalizedQuery.length < 3) {
    throw new Error('El término de búsqueda debe tener al menos 3 caracteres.');
  }

  const enrollments = await prisma.cycleEnrollment.findMany({
    where: {
      cycleId: parsedCycleId,
      user: {
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
          status: true,
        },
      },
      paymentAgreement: {
        select: {
          currentPendingAmount: true,
        },
      },
    },
    take: 15,
    orderBy: [
      { user: { lastName: 'asc' } },
      { user: { firstName: 'asc' } },
    ],
  });

  return enrollments.map((enrollment) => ({
    userId: enrollment.user.id,
    documentId: enrollment.user.documentId,
    fullName: `${enrollment.user.firstName} ${enrollment.user.lastName}`.trim(),
    status: enrollment.user.status,
    currentPendingAmount:
      enrollment.paymentAgreement?.currentPendingAmount === undefined
        ? null
        : enrollment.paymentAgreement.currentPendingAmount,
  }));
};

module.exports = {
  activateStudent,
  validatePaymentAgreementData,
  createPaymentAgreementForEnrollment,
  getStudentPaymentSummary,
  getPaymentHistory,
  registerPayment,
  registerDiscount,
  retireStudent,
  updateStudentStatus,
  getCyclePaymentSummary,
  getCyclePaymentHistory,
  searchStudentsForPayments,
};
