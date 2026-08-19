const studentService = require('../services/studentService');



module.exports = {
  
  getStudentById: async (req, res) => {
    try {
    const { id } = req.params;
    const { cycleId } = req.query;
    if (!id) return res.status(400).json({ error: "ID requerido" });

    const student = await studentService.getStudentFullDetails(id, cycleId);
    
    if (!student) {
      return res.status(404).json({ error: "Estudiante no encontrado" });
    }

    // Autorización: Admin/matriculador/kami pueden ver cualquier perfil.
    // Estudiantes solo pueden ver su propio perfil.
    const userRole = req.user?.role?.name;
    const isPrivileged = userRole === 'admin' || userRole === 'matriculador' || userRole === 'kami';
    const isOwnProfile = req.user?.id && parseInt(id) === req.user.id;

    if (!isPrivileged && !isOwnProfile) {
      return res.status(403).json({ error: 'Acceso denegado. Permiso insuficiente.' });
    }
    res.json(student);

  } catch (error) {
    
    res.status(500).json({ error: `Error al obtener la información del estudiante: ${error.message}` });
  }
}


};
