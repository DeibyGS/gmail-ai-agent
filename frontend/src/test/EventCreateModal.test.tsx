import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EventCreateModal from '../components/EventCreateModal';

describe('EventCreateModal', () => {
  it('renderiza el título del modal', () => {
    render(<EventCreateModal onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Nuevo evento')).toBeInTheDocument();
  });

  it('renderiza los campos de título y fecha', () => {
    render(<EventCreateModal onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText('Ej: Reunión con equipo')).toBeInTheDocument();
    // El input de fecha se busca por tipo porque el label no tiene htmlFor
    expect(document.querySelector('input[type="date"]')).toBeInTheDocument();
  });

  it('pre-llena la fecha si se pasa initialDate', () => {
    render(<EventCreateModal initialDate="2026-04-01" onConfirm={vi.fn()} onClose={vi.fn()} />);
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput.value).toBe('2026-04-01');
  });

  it('muestra error si se intenta crear sin título', async () => {
    render(<EventCreateModal initialDate="2026-04-01" onConfirm={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Crear evento'));
    await waitFor(() => {
      expect(screen.getByText('Título y fecha son obligatorios.')).toBeInTheDocument();
    });
  });

  it('muestra error si se intenta crear sin fecha', async () => {
    render(<EventCreateModal onConfirm={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Ej: Reunión con equipo'), {
      target: { value: 'Mi evento' },
    });
    fireEvent.click(screen.getByText('Crear evento'));
    await waitFor(() => {
      expect(screen.getByText('Título y fecha son obligatorios.')).toBeInTheDocument();
    });
  });

  it('llama onConfirm con el payload correcto al confirmar', async () => {
    const onConfirm = vi.fn();
    render(<EventCreateModal initialDate="2026-04-01" onConfirm={onConfirm} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Ej: Reunión con equipo'), {
      target: { value: 'Reunión importante' },
    });
    fireEvent.click(screen.getByText('Crear evento'));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Reunión importante', date: '2026-04-01' }),
        expect.objectContaining({ label: expect.any(String), color: expect.any(String) })
      );
    });
  });

  it('llama onClose al hacer click en Cancelar', () => {
    const onClose = vi.fn();
    render(<EventCreateModal onConfirm={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renderiza las etiquetas predefinidas', () => {
    render(<EventCreateModal onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('reunion')).toBeInTheDocument();
    expect(screen.getByText('trabajo')).toBeInTheDocument();
    expect(screen.getByText('urgente')).toBeInTheDocument();
  });
});
