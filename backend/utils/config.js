const crypto = require('crypto');

require('dotenv').config();

const config = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
};

if (!config.jwtSecret) {
  const suggested = crypto.randomBytes(32).toString('hex');
  console.error('══════════════════════════════════════════════════════');
  console.error('  ERROR: JWT_SECRET no está definido en variables de');
  console.error('  entorno. Agrega esta línea a tu archivo .env:');
  console.error('');
  console.error(`  JWT_SECRET=${suggested}`);
  console.error('');
  console.error('  O genéralo con: openssl rand -hex 64');
  console.error('══════════════════════════════════════════════════════');
  process.exit(1);
}

module.exports = { config };
