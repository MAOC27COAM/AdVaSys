export const MODALITY_LABELS = {
  PRE_U: 'Pre-Universitario',
  BECA_18: 'Beca 18',
  SECUNDARIA: 'Secundaria',
  PRIMARIA: 'Primaria',
  COAR: 'COAR',
  PRIMERA_OPCION: 'Primera Opcion',
};

export const MODALITY_SHORT_LABELS = {
  PRE_U: 'Pre-U',
  BECA_18: 'Beca 18',
  SECUNDARIA: 'Secundaria',
  PRIMARIA: 'Primaria',
  COAR: 'COAR',
  PRIMERA_OPCION: 'Primera Opción',
};

export const MODALITY_COLORS = {
  PRE_U: '#2b6df6',
  BECA_18: '#10b981',
  SECUNDARIA: '#f59e0b',
  PRIMARIA: '#8b5cf6',
  COAR: '#ec4899',
  PRIMERA_OPCION: '#06b6d4',
};

export const getAllowedModalities = (course = {}) => {
  if (Array.isArray(course.allowedModalities)) {
    return course.allowedModalities
      .map((item) => (typeof item === 'string' ? item : item?.modality))
      .filter(Boolean);
  }
  if (course.modality) return [course.modality];
  return [];
};