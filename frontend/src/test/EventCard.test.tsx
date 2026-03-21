import { render, screen, fireEvent } from '@testing-library/react';
import EventCard from '../components/EventCard';
import type { CalendarEvent, EventMeta } from '../types';

const mockEvent: CalendarEvent = {
  id: 'evt-1',
  title: 'Reunión de equipo',
  start: '2026-04-01T10:00:00',
  end: '2026-04-01T11:00:00',
  location: 'Sala A',
  description: 'Revisión semanal del proyecto',
};

const mockMeta: EventMeta = { label: 'reunion', color: '#4f46e5' };

describe('EventCard', () => {
  it('renderiza el título del evento', () => {
    render(<EventCard event={mockEvent} meta={mockMeta} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Reunión de equipo')).toBeInTheDocument();
  });

  it('renderiza el badge de etiqueta con el label correcto', () => {
    render(<EventCard event={mockEvent} meta={mockMeta} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('reunion')).toBeInTheDocument();
  });

  it('muestra la ubicación cuando existe', () => {
    render(<EventCard event={mockEvent} meta={mockMeta} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/Sala A/)).toBeInTheDocument();
  });

  it('muestra la descripción cuando existe', () => {
    render(<EventCard event={mockEvent} meta={mockMeta} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Revisión semanal del proyecto')).toBeInTheDocument();
  });

  it('no muestra ubicación si no existe', () => {
    const eventSinUbicacion = { ...mockEvent, location: undefined };
    render(<EventCard event={eventSinUbicacion} meta={mockMeta} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByText(/Sala A/)).not.toBeInTheDocument();
  });

  it('llama onEdit al hacer click en el botón de editar', () => {
    const onEdit = vi.fn();
    render(<EventCard event={mockEvent} meta={mockMeta} onEdit={onEdit} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByTitle('Editar evento'));
    expect(onEdit).toHaveBeenCalledWith(mockEvent);
  });

  it('llama onDelete cuando el usuario confirma eliminar', () => {
    const onDelete = vi.fn();
    render(<EventCard event={mockEvent} meta={mockMeta} onEdit={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByTitle('Eliminar evento'));      // abre ConfirmModal
    fireEvent.click(screen.getByText('Eliminar'));              // confirma en el modal
    expect(onDelete).toHaveBeenCalledWith('evt-1');
  });

  it('NO llama onDelete cuando el usuario cancela el confirm', () => {
    const onDelete = vi.fn();
    render(<EventCard event={mockEvent} meta={mockMeta} onEdit={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByTitle('Eliminar evento'));      // abre ConfirmModal
    fireEvent.click(screen.getByText('Cancelar'));              // cancela en el modal
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('muestra los botones de editar y eliminar', () => {
    render(<EventCard event={mockEvent} meta={mockMeta} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByTitle('Editar evento')).toBeInTheDocument();
    expect(screen.getByTitle('Eliminar evento')).toBeInTheDocument();
  });
});
