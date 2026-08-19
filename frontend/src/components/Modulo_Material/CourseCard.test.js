import React from 'react';
import { render, screen } from '@testing-library/react';
import CourseCard from './CourseCard';

const baseCourse = {
  id: 1,
  title: 'Matemáticas',
  description: 'Curso de álgebra y trigonometría',
  allowedModalities: [{ modality: 'PRE_U' }],
  createdAt: '2026-01-01T00:00:00.000Z',
  materialCount: 3,
};

describe('CourseCard', () => {
  it('muestra el título, la modalidad y el contador de materiales', () => {
    render(<CourseCard course={baseCourse} userRole="student" />);
    expect(screen.getByText('Matemáticas')).toBeInTheDocument();
    expect(screen.getByText('Pre-U')).toBeInTheDocument();
    expect(screen.getByText(/3 materiales/)).toBeInTheDocument();
  });

  it('muestra "+N" cuando el curso tiene más de una modalidad', () => {
    const multi = {
      ...baseCourse,
      allowedModalities: [{ modality: 'PRE_U' }, { modality: 'SECUNDARIA' }],
    };
    render(<CourseCard course={multi} userRole="student" />);
    expect(screen.getByText(/Pre-U \+1/)).toBeInTheDocument();
  });

  it('no muestra acciones de edición para el rol student', () => {
    render(<CourseCard course={baseCourse} userRole="student" />);
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
  });

  it('muestra acciones de edición para el rol teacher', () => {
    render(<CourseCard course={baseCourse} userRole="teacher" />);
    expect(screen.getByText('Editar')).toBeInTheDocument();
  });
});