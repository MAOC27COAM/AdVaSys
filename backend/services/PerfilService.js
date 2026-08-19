const prisma = require('../utils/prismaClient');

module.exports = {  
  /**
   * Extrae todos los datos del estudiante:
   * Datos de cuenta (User), perfil académico (StudentProfile) 
   * y su matrícula activa con el ciclo.
   */
  getStudentFullDetails: async (id) => {
    try {
      const numericId = parseInt(id, 10);

      if (isNaN(numericId)) {
        throw new Error("El ID proporcionado no es un número válido.");
      }

      const student = await prisma.user.findUnique({
        where: { id: numericId },
        include: {
          // Información académica específica
          studentProfile: true,
          // El rol para validar permisos en el front si es necesario
          role: {
            select: { name: true }
          },
          // Matrículas en ciclos para saber en qué ciclo está actualmente
          cycleEnrollments: {
            include: {
              cycle: true
            },
            take: 1, // Traemos la más reciente
            orderBy: { enrollmentDate: 'desc' }
          }
        },
      });

      return student;
    } catch (error) {
      console.error("Error en Prisma Service (getStudentFullDetails):", error);
      throw error;
    }
  },
};