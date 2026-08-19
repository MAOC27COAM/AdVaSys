const backupService = require('../services/backupService');

exports.exportDB = async (req, res, next) => {
  try {
    const sql = await backupService.exportDatabase();

    const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`;
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(sql);
  } catch (err) {
    next(err);
  }
};

exports.importDB = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Debe subir un archivo .sql' });
    }

    if (!req.file.originalname.toLowerCase().endsWith('.sql')) {
      return res.status(400).json({ error: 'El archivo debe tener extensión .sql' });
    }

    const skipDuplicates = req.body.skipDuplicates === 'true' || req.body.skipDuplicates === true;

    const result = await backupService.importDatabase(req.file.buffer, skipDuplicates);

    res.json(result);
  } catch (err) {
    next(err);
  }
};
