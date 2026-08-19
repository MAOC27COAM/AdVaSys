import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { courseService } from '../../services/courseService';
import CourseModule from './CourseModule';

jest.mock('../../services/courseService', () => ({
  courseService: {
    getAllCourses: jest.fn(),
    getCourseById: jest.fn(),
    getCourseMaterials: jest.fn(),
    getMaterialBinary: jest.fn(),
    deleteCourse: jest.fn(),
    deleteMaterial: jest.fn(),
  },
}));

// Evita cargar CourseDetail/CreateCourseForm (importan axios, ESM-only en jest).
jest.mock('./CourseDetail/CourseDetail', () => () => null);
jest.mock('./CreateCourseForm', () => () => null);

jest.mock(
  'react-router-dom',
  () => ({
    useOutletContext: () => ({ userRole: 'admin' }),
    useNavigate: () => jest.fn(),
    useParams: () => ({}),
  }),
  { virtual: true }
);

const courses = [
  {
    id: 1,
    title: 'Matemáticas',
    description: 'Álgebra y trigonometría',
    allowedModalities: [{ modality: 'PRE_U' }],
    materialCount: 2,
  },
  {
    id: 2,
    title: 'Historia',
    description: 'Historia universal',
    allowedModalities: [{ modality: 'SECUNDARIA' }],
    materialCount: 0,
  },
];

const renderModule = () => render(<CourseModule />);

describe('CourseModule', () => {
  beforeEach(() => {
    courseService.getAllCourses.mockReset();
    courseService.getAllCourses.mockResolvedValue(courses);
  });

  it('renderiza todos los cursos', async () => {
    renderModule();
    expect(await screen.findByText('Matemáticas')).toBeInTheDocument();
    expect(screen.getByText('Historia')).toBeInTheDocument();
  });

  it('filtra el catálogo por búsqueda', async () => {
    renderModule();
    await screen.findByText('Matemáticas');

    fireEvent.change(screen.getByLabelText('Buscar cursos'), {
      target: { value: 'mate' },
    });

    await waitFor(() => expect(screen.queryByText('Historia')).not.toBeInTheDocument());
    expect(screen.getByText('Matemáticas')).toBeInTheDocument();
  });

  it('filtra el catálogo por modalidad', async () => {
    renderModule();
    await screen.findByText('Matemáticas');

    fireEvent.click(screen.getByRole('button', { name: 'Secundaria' }));

    await waitFor(() => expect(screen.queryByText('Matemáticas')).not.toBeInTheDocument());
    expect(screen.getByText('Historia')).toBeInTheDocument();
  });
});