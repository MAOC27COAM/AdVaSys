const { PrismaClient } = require('@prisma/client');

// Se crea una única instancia de PrismaClient para ser usada en toda la aplicación.
// Esto evita crear múltiples conexiones a la base de datos, mejorando el rendimiento.
const prisma = new PrismaClient();

module.exports = prisma;
