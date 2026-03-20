import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EventEditModal from '../components/EventEditModal';
import type { CalendarEvent, EventMeta } from '../types';

const mockEvent: CalendarEvent = {
  id: 'evt-42',
  title: 'Standup diario',
  start: '2026-04-05T09:00:00',
  end:   '2026-04-05T09:30:00',
  location: 'Meet',
  description: 'Revisión rápida',
};

const mockMeta: EventMeta = { label: 'trabajo', color: '#0ea5e9' };

describe('EventEditModal', () => {
  it('renderiza el título del modal', () => {
    render(<EventEditModal event={mockEvent} currentMeta={mockMeta} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Editar evento')).toBeInTheDocument();
  });

  it('pre-llena el campo título con el evento actual', () => {
    render(<EventEditModal event={mockEvent} currentMeta={mockMeta} onConfirm={vi.fn()} onClose={vi.fn()} />);
    const titleInput = screen.getByDisplayValue('Standup diario');
    expect(titleInput).toBeInTheDocument();
  });

  it('pre-llena la fecha con el evento actual', () => {
    render(<EventEditModal event={mockEvent} currentMeta={mockMeta} onConfirm={vi.fn()} onClose={vi.fn()} />);
    const dateInput = screen.getByDisplayValue('2026-04-05') as HTMLInputElement;
    expect(dateInput.value).toBe('2026-04-05');
  });

  it('pre-llena la ubicación con el evento actual', () => {
    render(<EventEditModal event={mockEvent} currentMeta={mockMeta} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByDisplayValue('Meet')).toBeInTheDocument();
  });

  it('pre-llena la descripción con el evento actual', () => {
    render(<EventEditModal event={mockEvent} currentMeta={mockMeta} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByDisplayValue('Revisión rápida')).toBeInTheDocument();
  });

  it('muestra error al guardar sin título', async () => {
    render(<EventEditModal event={mockEvent} currentMeta={mockMeta} onConfirm={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByDisplayValue('Standup diario'), { target: { value: '' } });
    fireEvent.click(screen.getByText('Guardar cambios'));
    await waitFor(() => {
      expect(screen.getByText('Título y fecha son obligatorios.')).toBeInTheDocument();
    });
  });

  it('llama onConfirm con oldId y payload al guardar correctamente', async () => {
    const onConfirm = vi.fn();
    render(<EventEditModal event={mockEvent} currentMeta={mockMeta} onConfirm={onConfirm} onClose={vi.fn()} />);
    fireEvent.change(screen.getByDisplayValue('Standup diario'), {
      target: { value: 'Standup actualizado' },
    });
    fireEvent.click(screen.getByText('Guardar cambios'));
    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(
        'evt-42',
        expect.objectContaining({ title: 'Standup actualizado', date: '2026-04-05' }),
        expect.objectContaining({ label: 'trabajo' })
      );
    });
  });

  it('llama onClose al hacer click en Cancelar', () => {
    const onClose = vi.fn();
    render(<EventEditModal event={mockEvent} currentMeta={mockMeta} onConfirm={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalled();
  });
});
