const userService = require('../services/userService');
const { generateUsersPdf } = require('../utils/pdfGenerator');
const ExcelJS = require('exceljs');

const checkRole = (req, res, next) => {
  const userRoleName = req.user.role.name;
  if (userRoleName !== 'matriculador' && userRoleName !== 'admin' && userRoleName !== 'kami') {
    return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente.' });
  }
  next();
};

const getUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers(req.query);
    res.status(200).json(users);
  } catch (error) {
    if (error.message === 'Se requiere un ciclo activo válido.') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const data = req.body;

    const warnings = [];

    if (data.password) {
      delete data.password;
      warnings.push('password: No se permite cambiar la contraseña por este medio. Usa /api/auth/change-password.');
    }

    if (data.roleId || data.role) {
      delete data.roleId;
      delete data.role;
      warnings.push('role: No se permite cambiar el rol por este medio.');
    }

    const updatedUser = await userService.updateUser(userId, data);
    res.status(200).json({
      message: 'Usuario actualizado exitosamente',
      user: updatedUser,
      ...(warnings.length > 0 && { warnings }),
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'El usuario o su perfil asociado no fue encontrado.' });
    }
    next(error);
  }
};

const exportUsersToPdf = async (req, res, next) => {
  try {
    const { filters, columns } = req.body;

    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      return res.status(400).json({ error: 'La configuración de columnas es requerida.' });
    }

    const result = await userService.getAllUsers(Object.assign({}, filters, { skip: 0, take: 1000 }));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=user-list.pdf');

    generateUsersPdf(result.rows || result, columns, () => console.log('PDF generado y enviado.'), res);
  } catch (error) {
    if (error.message === 'Se requiere un ciclo activo válido.') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

const getCycleFilters = async (req, res, next) => {
  try {
    const { cycleId } = req.query;
    if (!cycleId) {
      return res.status(400).json({ error: 'Se requiere ciclo activo.' });
    }
    const filters = await userService.getCycleFilters(parseInt(cycleId));
    res.status(200).json(filters);
  } catch (error) {
    next(error);
  }
};

const getAdminUsers = async (req, res, next) => {
  try {
    const users = await userService.getAdminUsers(req.query);
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const requesterRole = req.user.role.name;
    const { roleName } = req.body;

    if (requesterRole === 'matriculador' && roleName === 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para crear usuarios administradores.' });
    }

    const newUser = await userService.createUser(req.body);
    res.status(201).json({ message: 'Usuario creado exitosamente', user: newUser });
  } catch (error) {
    if (
      error.message.includes('ya está registrado') ||
      error.message.includes('no es válido') ||
      error.message.includes('al menos 6 caracteres')
    ) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

const deactivateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    await userService.deactivateUser(userId);
    res.status(200).json({ message: 'Usuario dado de baja exitosamente.' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'El usuario no fue encontrado.' });
    }
    next(error);
  }
};

const exportUsersToExcel = async (req, res, next) => {
  try {
    const { filters, columns } = req.body;

    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      return res.status(400).json({ error: 'La configuracion de columnas es requerida.' });
    }

    const result = await userService.getAllUsers(Object.assign({}, filters, { skip: 0, take: 1000 }));
    const users = result.rows || result;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Estudiantes');

    worksheet.columns = columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: Math.max(String(column.header || '').length + 4, 18),
    }));

    const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    const headerAlign = { vertical: 'middle', horizontal: 'center' };
    const thinBorder = (color) => ({
      top: { style: 'thin', color: { argb: color } },
      left: { style: 'thin', color: { argb: color } },
      bottom: { style: 'thin', color: { argb: color } },
      right: { style: 'thin', color: { argb: color } },
    });

    const headerRow = worksheet.getRow(1);
    headerRow.font = headerFont;
    headerRow.fill = headerFill;
    headerRow.alignment = headerAlign;
    headerRow.border = thinBorder('FFB0B0B0');
    headerRow.height = 22;

    users.forEach((user, index) => {
      const row = worksheet.addRow({
        ...user,
        debtLabel:
          user.currentPendingAmount === null
            ? 'SIN ACUERDO'
            : `S/ ${Number(user.currentPendingAmount).toFixed(2)}`,
      });

      row.border = thinBorder('FFD0D0D0');

      if (index % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } };
        });
      }
    });

    worksheet.columns.forEach((column) => {
      let maxLength = column.header ? column.header.length : 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const valueLength = String(cell.value ?? '').length;
        if (valueLength > maxLength) {
          maxLength = valueLength;
        }
      });
      column.width = Math.min(Math.max(maxLength + 3, 12), 35);
    });

    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=estudiantes-ciclo.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    if (error.message === 'Se requiere un ciclo activo válido.') {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

module.exports = {
  getUsers,
  updateUser,
  exportUsersToPdf,
  exportUsersToExcel,
  getCycleFilters,
  getAdminUsers,
  createUser,
  deactivateUser,
  checkRole,
};
