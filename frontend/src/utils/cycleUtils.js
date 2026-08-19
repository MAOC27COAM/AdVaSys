export const isCycleOperable = (cycle) => {
  if (!cycle?.startDate || !cycle?.endDate) {
    return false;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(cycle.startDate);
  const endDate = new Date(cycle.endDate);
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

  return today >= start && today <= end;
};
