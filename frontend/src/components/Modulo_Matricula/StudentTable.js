import React from 'react';
import styles from './StudentTable.module.css';

function StudentTable({ students, onEdit, onView }) {
  const renderBadge = (value, type) => {
    if (!value || value === 'N/A') {
      return <span className={styles.badgeNa}>N/A</span>;
    }

    let badgeClass = '';
    switch (type) {
      case 'modality':
        badgeClass = styles.badgeModality;
        break;
      case 'group':
        badgeClass = styles.badgeGroup;
        break;
      case 'schedule':
        badgeClass = styles.badgeSchedule;
        break;
      case 'status':
        badgeClass =
          value === 'ACTIVE'
            ? styles.badgeStatusActive
            : value === 'RETIRED'
              ? styles.badgeStatusRetired
              : styles.badgeStatusObservation;
        break;
      default:
        badgeClass = '';
    }

    return <span className={`${styles.badge} ${badgeClass}`}>{value}</span>;
  };

  return (
    <div className={styles.studentTableContainer}>
      <table className={styles.studentTable}>
        <thead>
          <tr>
            <th>#</th>
            <th>DNI</th>
            <th>Nombre</th>
            <th>Apellido</th>
            <th>Modalidad</th>
            <th>Grupo</th>
            <th>Turno</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {students.length > 0 ? (
            students.map((student, index) => (
              <tr
                key={student.id}
                className={onView ? styles.clickableRow : ''}
                onClick={() => onView && onView(student)}
                onKeyDown={(event) => {
                  if (!onView) {
                    return;
                  }

                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onView(student);
                  }
                }}
                tabIndex={onView ? 0 : undefined}
                aria-label={onView ? `Ver detalle de ${student.firstName} ${student.lastName}` : undefined}
              >
                <td>{index + 1}</td>
                <td>{student.documentId}</td>
                <td>{student.firstName}</td>
                <td>{student.lastName}</td>
                <td>{renderBadge(student.modality || 'N/A', 'modality')}</td>
                <td>{renderBadge(student.group || 'N/A', 'group')}</td>
                <td>{renderBadge(student.schedule || 'N/A', 'schedule')}</td>
                <td>{renderBadge(student.status || 'N/A', 'status')}</td>
                <td>
                  <button
                    className={styles.editButton}
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit && onEdit(student);
                    }}
                    aria-label={`Editar ${student.firstName} ${student.lastName}`}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="9" className={styles.noStudentsFound}>
                No se encontraron estudiantes.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default StudentTable;
