const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

/*
 * Contraseñas por defecto del seed.
 *
 * IMPORTANTE:
 * - En desarrollo se usan los valores por defecto (con advertencia en consola).
 * - En PRODUCCIÓN define SEED_PASSWORD_KAMI, SEED_PASSWORD_ADMIN y
 *   SEED_PASSWORD_MATRICULADOR en las variables de entorno y, además,
 *   cambia estas contraseñas inmediatamente después del primer inicio de sesión.
 */
const SEED_PASSWORD_KAMI = process.env.SEED_PASSWORD_KAMI || 'aduni@vallejokami';
const SEED_PASSWORD_ADMIN = process.env.SEED_PASSWORD_ADMIN || 'aduni@vallejoAdmin1';
const SEED_PASSWORD_MATRICULADOR = process.env.SEED_PASSWORD_MATRICULADOR || 'aduni@vallejoMatri';

const USING_DEFAULT_PASSWORDS =
  !process.env.SEED_PASSWORD_KAMI &&
  !process.env.SEED_PASSWORD_ADMIN &&
  !process.env.SEED_PASSWORD_MATRICULADOR;

async function upsertBaseUsers(roleIds) {
  if (USING_DEFAULT_PASSWORDS) {
    console.warn(
      '⚠️  ADVERTENCIA: el seed está usando contraseñas por defecto. ' +
        'En producción define SEED_PASSWORD_* y cambia estas contraseñas ' +
        'inmediatamente después del primer inicio de sesión.'
    );
  }

  if (roleIds.kami) {
    const hashedPassword = await bcrypt.hash(SEED_PASSWORD_KAMI, 10);
    await prisma.user.upsert({
      where: { username: 'kami' },
      update: {},
      create: {
        username: 'kami',
        password: hashedPassword,
        firstName: 'Kami',
        lastName: 'Superuser',
        documentId: '00000000',
        roleId: roleIds.kami,
      },
    });
    console.log(`Usuario base listo: kami / (clave ${USING_DEFAULT_PASSWORDS ? 'por defecto' : 'definida por env'})`);
  }

  if (roleIds.admin) {
    const hashedPassword = await bcrypt.hash(SEED_PASSWORD_ADMIN, 10);
    await prisma.user.upsert({
      where: { username: 'Admin_1' },
      update: {},
      create: {
        username: 'Admin_1',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'Principal',
        documentId: '11111111',
        roleId: roleIds.admin,
      },
    });
    console.log(`Usuario base listo: Admin_1 / (clave ${USING_DEFAULT_PASSWORDS ? 'por defecto' : 'definida por env'})`);
  }

  if (roleIds.matriculador) {
    const matriculadores = [
      { username: 'Matri_1', firstName: 'Beltram', documentId: '22222222' },
      { username: 'Matri_2', firstName: 'Asistente', documentId: '33333333' },
    ];

    for (const user of matriculadores) {
      const hashedPassword = await bcrypt.hash(SEED_PASSWORD_MATRICULADOR, 10);
      await prisma.user.upsert({
        where: { username: user.username },
        update: {},
        create: {
          username: user.username,
          password: hashedPassword,
          firstName: user.firstName,
          lastName: 'Matriculador',
          documentId: user.documentId,
          roleId: roleIds.matriculador,
        },
      });
      console.log(`Usuario base listo: ${user.username} / (clave ${USING_DEFAULT_PASSWORDS ? 'por defecto' : 'definida por env'})`);
    }
  }
}

async function main() {
  console.log('Iniciando seed base...');

  const rolesToCreate = [
    { id: 1, name: 'admin' },
    { id: 2, name: 'teacher' },
    { id: 3, name: 'student' },
    { id: 4, name: 'matriculador' },
    { id: 5, name: 'kami' },
  ];

  const roleIds = {};
  for (const roleData of rolesToCreate) {
    const role = await prisma.role.upsert({
      where: { id: roleData.id },
      update: { name: roleData.name },
      create: roleData,
    });
    roleIds[role.name] = role.id;
    console.log(`Rol listo: ${role.name} (ID: ${role.id})`);
  }

  await upsertBaseUsers(roleIds);

  const modalitiesToCreate = [
    { id: 1, name: 'PRE_U' },
    { id: 2, name: 'BECA_18' },
    { id: 3, name: 'SECUNDARIA' },
    { id: 4, name: 'PRIMARIA' },
    { id: 5, name: 'COAR' },
    { id: 6, name: 'PRIMERA_OPCION' },
  ];

  for (const modalityData of modalitiesToCreate) {
    const modality = await prisma.academicModality.upsert({
      where: { id: modalityData.id },
      update: { name: modalityData.name },
      create: modalityData,
    });
    console.log(`Modalidad lista: ${modality.name} (ID: ${modality.id})`);
  }

  console.log('Seed base finalizado.');
}

main()
  .catch((error) => {
    console.error('Ocurrio un error durante el seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });