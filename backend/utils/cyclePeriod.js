const toDateOnly = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const assertCycleIsOperable = async (prismaClient, cycleId) => {
  const parsedCycleId = parseInt(cycleId, 10);

  if (Number.isNaN(parsedCycleId)) {
    throw new Error('El ciclo seleccionado es inválido.');
  }

  const cycle = await prismaClient.cycle.findUnique({
    where: { id: parsedCycleId },
  });

  if (!cycle) {
    throw new Error('Ciclo no encontrado.');
  }

  const now = toDateOnly(new Date());
  const startDate = toDateOnly(cycle.startDate);
  const endDate = toDateOnly(cycle.endDate);

  if (now < startDate || now > endDate) {
    throw new Error('Ciclo terminado');
  }

  return cycle;
};

module.exports = {
  assertCycleIsOperable,
};
