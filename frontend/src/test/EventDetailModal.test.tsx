import { render, screen, fireEvent } from '@testing-library/react';
import EventDetailModal from '../components/EventDetailModal';
import type { CalendarEvent, EventMeta } from '../types';

const mockEvent: CalendarEvent = {
  id: 'evt-99',
  title: 'Demo de producto',
  start: '2026-04-10T15:00:00',
  end:   '2026-04-10T16:00:00',
  location: 'Sala B',
  description: 'Presentación al cliente',
  link: 'https://calendar.google.com/event?eid=99',
};

const mockMeta: EventMeta = { label: 'reunion', color: '#4f46e5' };

describe('EventDetailModal', () => {
  it('renderiza el título del evento', () => {
    render(<EventDetailModal event={mockEvent} meta={mockMeta} onDelete={vi.fn()} onClose={vi.fn()} onMetaChange={vi.fn()} />);
    expect(screen.getByText('Demo de producto')).toBeInTheDocument();
  });

  it('muestra la fecha de inicio formateada', () => {
    render(<EventDetailModal event={mockEvent} meta={mockMeta} onDelete={vi.fn()} onClose={vi.fn()} onMetaChange={vi.fn()} />);
    expect(screen.getByText('Inicio')).toBeInTheDocument();
  });

  it('muestra la ubicación cuando existe', () => {
    render(<EventDetailModal event={mockEvent} meta={mockMeta} onDelete={vi.fn()} onClose={vi.fn()} onMetaChange={vi.fn()} />);
    expect(screen.getByText(/Sala B/)).toBeInTheDocument();
  });

  it('muestra la descripción cuando existe', () => {
    render(<EventDetailModal event={mockEvent} meta={mockMeta} onDelete={vi.fn()} onClose={vi.fn()} onMetaChange={vi.fn()} />);
    expect(screen.getByText('Presentación al cliente')).toBeInTheDocument();
  });

  it('muestra el link de Google Calendar cuando existe', () => {
    render(<EventDetailModal event={mockEvent} meta={mockMeta} onDelete={vi.fn()} onClose={vi.fn()} onMetaChange={vi.fn()} />);
    expect(screen.getByText('Ver en Google Calendar →')).toBeInTheDocument();
  });

  it('NO muestra el botón Editar si onEdit no se pasa', () => {
    render(<EventDetailModal event={mockEvent} meta={mockMeta} onDelete={vi.fn()} onClose={vi.fn()} onMetaChange={vi.fn()} />);
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
  });

  it('muestra el botón Editar si se pasa onEdit', () => {
    render(<EventDetailModal event={mockEvent} meta={mockMeta} onDelete={vi.fn()} onClose={vi.fn()} onMetaChange={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText('Editar')).toBeInTheDocument();
  });

  it('llama onEdit al hacer click en Editar', () => {
    const onEdit = vi.fn();
    const onClose = vi.fn();
    render(<EventDetailModal event={mockEvent} meta={mockMeta} onDelete={vi.fn()} onClose={onClose} onMetaChange={vi.fn()} onEdit={onEdit} />);
    fireEvent.click(screen.getByText('Editar'));
    expect(onEdit).toHaveBeenCalledWith(mockEvent);
  });

  it('llama onDelete cuando el usuario confirma eliminar', () => {
    const onDelete = vi.fn();
    render(<EventDetailModal event={mockEvent} meta={mockMeta} onDelete={onDelete} onClose={vi.fn()} onMetaChange={vi.fn()} />);
    fireEvent.click(screen.getByText('Eliminar'));              // abre ConfirmModal
    fireEvent.click(screen.getAllByText('Eliminar')[0]);        // confirma en el modal
    expect(onDelete).toHaveBeenCalledWith('evt-99');
  });

  it('NO llama onDelete si el usuario cancela el confirm', () => {
    const onDelete = vi.fn();
    render(<EventDetailModal event={mockEvent} meta={mockMeta} onDelete={onDelete} onClose={vi.fn()} onMetaChange={vi.fn()} />);
    fireEvent.click(screen.getByText('Eliminar'));              // abre ConfirmModal
    fireEvent.click(screen.getByText('Cancelar'));              // cancela en el modal
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('llama onClose al hacer click en Cerrar', () => {
    const onClose = vi.fn();
    render(<EventDetailModal event={mockEvent} meta={mockMeta} onDelete={vi.fn()} onClose={onClose} onMetaChange={vi.fn()} />);
    fireEvent.click(screen.getByText('Cerrar'));
    expect(onClose).toHaveBeenCalled();
  });

  it('renderiza los botones de etiqueta', () => {
    render(<EventDetailModal event={mockEvent} meta={mockMeta} onDelete={vi.fn()} onClose={vi.fn()} onMetaChange={vi.fn()} />);
    expect(screen.getByText('urgente')).toBeInTheDocument();
    expect(screen.getByText('personal')).toBeInTheDocument();
  });

  it('NO muestra sección de recurrencia si el evento no es recurrente', () => {
    render(<EventDetailModal event={mockEvent} meta={mockMeta} onDelete={vi.fn()} onClose={vi.fn()} onMetaChange={vi.fn()} />);
    expect(screen.queryByText('Recurrencia')).not.toBeInTheDocument();
  });

  it('muestra la recurrencia semanal en español', () => {
    const recurringEvent: CalendarEvent = {
      ...mockEvent,
      recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE'],
    };
    render(<EventDetailModal event={recurringEvent} meta={mockMeta} onDelete={vi.fn()} onClose={vi.fn()} onMetaChange={vi.fn()} />);
    expect(screen.getByText('Recurrencia')).toBeInTheDocument();
    expect(screen.getByText(/Cada semana · Lunes, Miércoles/)).toBeInTheDocument();
  });

  it('muestra la recurrencia diaria en español', () => {
    const recurringEvent: CalendarEvent = {
      ...mockEvent,
      recurrence: ['RRULE:FREQ=DAILY'],
    };
    render(<EventDetailModal event={recurringEvent} meta={mockMeta} onDelete={vi.fn()} onClose={vi.fn()} onMetaChange={vi.fn()} />);
    expect(screen.getByText(/Todos los días/)).toBeInTheDocument();
  });

  it('muestra la recurrencia mensual en español', () => {
    const recurringEvent: CalendarEvent = {
      ...mockEvent,
      recurrence: ['RRULE:FREQ=MONTHLY;BYMONTHDAY=15'],
    };
    render(<EventDetailModal event={recurringEvent} meta={mockMeta} onDelete={vi.fn()} onClose={vi.fn()} onMetaChange={vi.fn()} />);
    expect(screen.getByText(/Cada mes · día 15/)).toBeInTheDocument();
  });
});
