import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FileUploadZone from './FileUploadZone';

jest.mock('../../../services/courseService', () => ({
  courseService: { uploadMaterial: jest.fn() },
}));

const renderZone = (props = {}) =>
  render(
    <FileUploadZone courseId={1} onUploadSuccess={jest.fn()} onCancel={jest.fn()} {...props} />
  );

describe('FileUploadZone', () => {
  it('rechaza un archivo de tipo no permitido', () => {
    const { container } = renderZone();
    const input = container.querySelector('#fileInput');
    const file = new File(['x'], 'virus.exe', { type: 'application/x-msdownload' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('Formato no permitido.')).toBeInTheDocument();
  });

  it('rechaza un archivo que supera el tamaño máximo', () => {
    const { container } = renderZone();
    const input = container.querySelector('#fileInput');
    const bigFile = new File([new ArrayBuffer(21 * 1024 * 1024)], 'grande.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(input, { target: { files: [bigFile] } });

    expect(screen.getByText('El archivo excede los 20MB.')).toBeInTheDocument();
  });

  it('acepta un archivo soltado mediante drag & drop', () => {
    renderZone();
    const dropZone = screen.getByText('Seleccionar archivo').closest('div');
    const file = new File(['pdf'], 'libro.pdf', { type: 'application/pdf' });

    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(screen.getByText('libro.pdf')).toBeInTheDocument();
  });
});