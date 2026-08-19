const EIGHT_DIGIT_DNI_REGEX = /^\d{8}$/;
const NUMERIC_REGEX = /^\d+$/;

const trimToNull = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
};

const normalizeUppercaseText = (value) => {
  const normalized = trimToNull(value);
  return normalized ? normalized.toUpperCase() : null;
};

const validateDocumentId = (value) => {
  const normalized = trimToNull(value);

  if (!normalized || !EIGHT_DIGIT_DNI_REGEX.test(normalized)) {
    throw new Error('El DNI debe contener exactamente 8 dígitos numéricos.');
  }

  return normalized;
};

const normalizeReceiptNumber = (value) => {
  const normalized = trimToNull(value);

  if (!normalized) {
    return null;
  }

  if (!NUMERIC_REGEX.test(normalized)) {
    throw new Error('El número de recibo solo admite valores numéricos.');
  }

  return normalized.padStart(8, '0');
};

const validateOptionalNumericField = (value, label) => {
  const normalized = trimToNull(value);

  if (!normalized) {
    return null;
  }

  if (!NUMERIC_REGEX.test(normalized)) {
    throw new Error(`${label} solo admite valores numéricos.`);
  }

  return normalized;
};

const normalizeEmail = (value) => trimToNull(value);

const normalizeUserData = (userData = {}) => ({
  firstName: normalizeUppercaseText(userData.firstName),
  lastName: normalizeUppercaseText(userData.lastName),
  email: normalizeEmail(userData.email),
  documentId: validateDocumentId(userData.documentId),
  phone: trimToNull(userData.phone),
  address: normalizeUppercaseText(userData.address),
  profilePictureUrl: trimToNull(userData.profilePictureUrl),
});

const normalizeStudentProfileData = (studentProfileData = {}) => ({
  modality: studentProfileData.modality || null,
  schedule: studentProfileData.schedule || null,
  age: (() => {
    if (
      studentProfileData.age === '' ||
      studentProfileData.age === null ||
      studentProfileData.age === undefined
    ) {
      return null;
    }

    const parsedAge = parseInt(studentProfileData.age, 10);
    return Number.isNaN(parsedAge) ? null : parsedAge;
  })(),
  schoolOfOrigin: normalizeUppercaseText(studentProfileData.schoolOfOrigin),
  guardianName: normalizeUppercaseText(studentProfileData.guardianName),
  guardianPhone: validateOptionalNumericField(
    studentProfileData.guardianPhone,
    'El celular del apoderado'
  ),
  group: trimToNull(studentProfileData.group),
  section: trimToNull(studentProfileData.section),
});

module.exports = {
  normalizeEmail,
  normalizeReceiptNumber,
  normalizeStudentProfileData,
  normalizeUppercaseText,
  normalizeUserData,
  trimToNull,
  validateDocumentId,
  validateOptionalNumericField,
};
