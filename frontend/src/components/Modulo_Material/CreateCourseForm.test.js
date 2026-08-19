import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import axios from 'axios';
import CreateCourseForm from './CreateCourseForm';

jest.mock('axios', () => ({
  post: jest.fn(),
  patch: jest.fn(),
}));

const renderForm = (props = {}) =>
  render(<CreateCourseForm onClose={jest.fn()} onSuccess={jest.fn()} {...props} />);

describe('CreateCourseForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra errores de validación al enviar el formulario vacío', () => {
    renderForm();
    fireEvent.click(screen.getByText('Guardar curso'));
    expect(screen.getByText('El titulo es obligatorio')).toBeInTheDocument();
    expect(screen.getByText('Selecciona al menos una modalidad')).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('envía imageUrl vacía al quitar la portada en edición', async () => {
    const courseToEdit = {
      id: 1,
      title: 'Matemáticas',
      code: 'CUR-1',
      imageUrl: '/uploads/course-covers/portada.png',
      allowedModalities: [{ modality: 'PRE_U' }],
    };
    axios.patch.mockResolvedValue({ data: {} });
    renderForm({ courseToEdit });

    fireEvent.click(screen.getByText('Eliminar'));
    fireEvent.click(screen.getByText('Guardar curso'));

    await screen.findByText('Curso actualizado exitosamente.');

    expect(axios.patch).toHaveBeenCalledTimes(1);
    const formData = axios.patch.mock.calls[0][1];
    expect(formData.get('imageUrl')).toBe('');
    expect(formData.get('image')).toBeNull();
  });
});