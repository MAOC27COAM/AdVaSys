const { createHttpError } = require('../utils/httpError');

const getRoleName = (user) => user?.role?.name || user?.role || null;

const requireRoles = (allowedRoles, options = {}) => {
  const {
    forbiddenMessage = 'No tienes permisos para realizar esta acción.',
    unauthenticatedMessage = 'Debes iniciar sesión para continuar.',
  } = options;

  return (req, res, next) => {
    const roleName = getRoleName(req.user);

    if (!req.user) {
      return next(createHttpError(401, unauthenticatedMessage));
    }

    if (!roleName || !allowedRoles.includes(roleName)) {
      return next(
        createHttpError(403, forbiddenMessage, {
          currentRole: roleName,
          allowedRoles,
        })
      );
    }

    return next();
  };
};

module.exports = {
  getRoleName,
  requireRoles,
};
