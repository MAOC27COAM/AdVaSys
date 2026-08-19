// backend/utils/pdfGenerator.js
const PDFDocument = require('pdfkit');

/**
 * Genera un documento PDF a partir de una lista de usuarios y columnas definidas.
 * @param {Array<Object>} users - La lista de usuarios a incluir en el PDF.
 * @param {Array<Object>} columns - Un array de objetos que define las columnas.
 *   Ej: [{ header: 'ID', key: 'id' }, { header: 'Nombre', key: 'firstName' }]
 * @param {Function} endCallback - Callback que se ejecuta cuando el PDF ha terminado de escribirse.
 * @param {stream.Writable} stream - El stream de escritura donde se enviará el PDF.
 */
function generateUsersPdf(users, columns, endCallback, stream) {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  stream.on('finish', endCallback);
  doc.pipe(stream);

  // --- Header del Documento ---
  doc
    .fontSize(20)
    .text('Lista de Usuarios', { align: 'center' })
    .moveDown(0.5);

  const tableTop = doc.y;
  const columnWidths = columns.map(() => (doc.page.width - 60) / columns.length);
  
  // --- Headers de la Tabla ---
  doc.fontSize(10).font('Helvetica-Bold');
  let currentX = 30;
  columns.forEach((column, i) => {
    doc.text(column.header, currentX, tableTop, { width: columnWidths[i], align: 'center' });
    currentX += columnWidths[i];
  });
  doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke().moveDown(0.5);

  // --- Filas de la Tabla ---
  doc.font('Helvetica');
  users.forEach(user => {
    const rowY = doc.y;
    currentX = 30;
    columns.forEach((column, i) => {
      // Navegación simple para propiedades anidadas (ej: role.name)
      const value = column.key.split('.').reduce((o, k) => (o || {})[k], user) || '';
      doc.text(value.toString(), currentX, rowY, { width: columnWidths[i], align: 'left' });
      currentX += columnWidths[i];
    });
    doc.moveTo(30, doc.y + 15).lineTo(doc.page.width - 30, doc.y + 15).stroke().moveDown(0.5);
  });

  doc.end();
}

module.exports = { 
  generateUsersPdf,
  generateSchedulePdf: (schedule, endCallback, stream) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    stream.on('finish', endCallback);
    doc.pipe(stream);

    // Header del Documento
    doc
      .fontSize(18)
      .text(`Horario: ${schedule.name}`, { align: 'center' })
      .fontSize(12)
      .text(`Modalidad: ${schedule.modality} - Grupo: ${schedule.group}`, { align: 'center' })
      .moveDown(1.5);

    // Tabla del Horario
    const tableTop = doc.y;
    const days = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    const columnWidth = (doc.page.width - 60) / days.length;
    
    // Headers de la Tabla (Días de la semana)
    doc.fontSize(10).font('Helvetica-Bold');
    let currentX = 30;
    days.forEach(day => {
      doc.text(day, currentX, tableTop, { width: columnWidth, align: 'center' });
      currentX += columnWidth;
    });
    doc.moveTo(30, doc.y).lineTo(doc.page.width - 30, doc.y).stroke().moveDown(0.5);

    // Organizar sesiones por día
    const sessionsByDay = {};
    days.forEach(day => sessionsByDay[day] = []);
    schedule.sessions.forEach(session => {
      if (sessionsByDay[session.dayOfWeek]) {
        sessionsByDay[session.dayOfWeek].push(session);
      }
    });

    // Encontrar el número máximo de sesiones en un día para determinar las filas
    const maxRows = Math.max(...Object.values(sessionsByDay).map(daySessions => daySessions.length));
    
    doc.font('Helvetica').fontSize(8);
    for (let i = 0; i < maxRows; i++) {
      const rowY = doc.y;
      currentX = 30;
      days.forEach(day => {
        const session = sessionsByDay[day][i];
        if (session) {
          const startTime = new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const endTime = new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const teacherName = session.teacher ? `${session.teacher.firstName} ${session.teacher.lastName}` : 'No asignado';
          
          doc.text(
            `${startTime} - ${endTime}\n${session.course.title}\n${teacherName}\nAula: ${session.classroom || 'N/A'}`,
            currentX + 2,
            rowY + 2,
            { width: columnWidth - 4, align: 'left' }
          );
        }
        currentX += columnWidth;
      });
      doc.y = rowY + 50; // Altura fija por fila
    }

    doc.end();
  }
};
