const { spawn } = require('child_process');

const TABLE_ORDER = [
  'Role',
  'User',
  'StudentProfile', 'TeacherProfile',
  'Cycle', 'Course', 'AcademicModality',
  'CourseModality', 'CycleEnrollment', 'File',
  'PaymentAgreement',
  'PaymentInstallment', 'PaymentTransaction',
  'LeaderboardEntry', 'SimulationEvent',
  'SimulationEventModalities', 'SimulationInstance',
  'SimulationResult',
  'AttendanceSession', 'AttendanceRecord',
  'ClassSchedule', 'ClassSession',
  'AuditLog', 'SystemConfig',
];

function getDbUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no configurada en variables de entorno.');
  }
  return process.env.DATABASE_URL;
}

function countInserts(sql) {
  const matches = sql.match(/^INSERT INTO/gm);
  return matches ? matches.length : 0;
}

function transformSql(sql, skipDuplicates) {
  if (!skipDuplicates) return sql;

  return sql
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('INSERT INTO')) {
        return line.replace(/;\s*$/, '') + ' ON CONFLICT DO NOTHING;';
      }
      return line;
    })
    .join('\n');
}

function reorderInserts(sql) {
  const insertLines = [];
  const otherLines = [];

  for (const line of sql.split('\n')) {
    const match = line.match(/^INSERT INTO\s+"?(\w+)"?\s/i);
    if (match) {
      const tableName = match[1];
      const orderIndex = TABLE_ORDER.indexOf(tableName);
      insertLines.push({ line, order: orderIndex === -1 ? 999 : orderIndex });
    } else {
      otherLines.push(line);
    }
  }

  insertLines.sort((a, b) => a.order - b.order);

  return [...otherLines, ...insertLines.map((i) => i.line)].join('\n');
}

function parsePsqlOutput(output) {
  let insertCount = 0;
  let conflictCount = 0;

  for (const line of output.split('\n')) {
    const match = line.match(/^INSERT\s+\d+\s+(\d+)/);
    if (match) {
      const count = parseInt(match[1], 10);
      if (count === 0) {
        conflictCount++;
      } else {
        insertCount += count;
      }
    }
  }

  return { insertCount, conflictCount };
}

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { shell: process.platform === 'win32' });
    const chunks = [];

    proc.stdout.on('data', (data) => chunks.push(data));

    let stderr = '';
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`'${cmd}' falló (código ${code}): ${stderr}`));
      }
    });

    proc.on('error', (err) => {
      reject(
        new Error(
          `'${cmd}' no encontrado. ${err.message}. Instala PostgreSQL client tools o agrégalo al PATH.`
        )
      );
    });
  });
}

function runCommandWithInput(cmd, input, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { shell: process.platform === 'win32' });
    const chunks = [];
    let stderr = '';

    proc.stdout.on('data', (data) => chunks.push(data));
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`'${cmd}' falló (código ${code}): ${stderr}`));
    });

    proc.on('error', (err) => {
      reject(
        new Error(
          `'${cmd}' no encontrado. ${err.message}. Instala PostgreSQL client tools o agrégalo al PATH.`
        )
      );
    });

    proc.stdin.write(input);
    proc.stdin.end();
  });
}

async function exportDatabase() {
  const dbUrl = getDbUrl();

  const sql = await runCommand('pg_dump', [
    '-d', dbUrl,
    '--data-only',
    '--column-inserts',
    '--no-owner',
    '--no-acl',
  ]);

  return sql;
}

async function importDatabase(sqlBuffer, skipDuplicates) {
  const dbUrl = getDbUrl();
  const sql = sqlBuffer.toString('utf-8');

  const totalStatements = countInserts(sql);

  let processedSql = reorderInserts(sql);
  if (skipDuplicates) {
    processedSql = transformSql(processedSql, true);
  }

  let result;
  try {
    const output = await runCommandWithInput('psql', processedSql, [
      '-d', dbUrl,
      '-v', 'ON_ERROR_STOP=1',
    ]);

    const { insertCount, conflictCount } = parsePsqlOutput(output.toString('utf-8'));

    result = {
      success: true,
      total_sentencias: totalStatements,
      añadidos: insertCount,
      omitidos: conflictCount,
      errores: 0,
    };
  } catch (err) {
    result = {
      success: false,
      total_sentencias: totalStatements,
      añadidos: 0,
      omitidos: 0,
      errores: 1,
      error: err.message,
    };
  }

  return result;
}

module.exports = {
  exportDatabase,
  importDatabase,
};
