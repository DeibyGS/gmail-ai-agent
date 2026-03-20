import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import CalendarPage from '../pages/CalendarPage';

// Mock de react-big-calendar — evita problemas de renderizado del grid en jsdom
vi.mock('react-big-calendar', () => ({
  Calendar: ({ onSelectSlot }: { onSelectSlot?: (s: { start: Date }) => void }) => (
    <div data-testid="rbc-calendar">
      <button onClick={() => onSelectSlot?.({ start: new Date('2026-04-10') })}>
        Slot vacío
      </button>
    </div>
  ),
  dateFnsLocalizer: () => ({}),
}));

// Mock de la capa de servicios API
vi.mock('../services/api', () => ({
  fetchCalendarEvents: vi.fn().mockResolvedValue([
    {
      id: 'evt-1',
      title: 'Reunión de equipo',
      start: '2026-04-01T10:00:00',
      end: '2026-04-01T11:00:00',
      location: 'Sala A',
    },
  ]),
  createCalendarEvent: vi.fn().mockResolvedValue({
    id: 'evt-new',
    title: 'Nuevo evento',
    start: '2026-04-10T00:00:00',
    end: '2026-04-10T01:00:00',
  }),
  deleteCalendarEvent: vi.fn().mockResolvedValue(undefined),
}));

// Mock de date-fns/locale para evitar problemas de módulo ESM en jsdom
vi.mock('date-fns/locale', () => ({ es: {} }));

describe('CalendarPage', () => {
  it('muestra el encabezado "Calendario"', async () => {
    render(<CalendarPage />);
    // Usar getByRole para distinguir el h1 del botón de pestaña
    expect(screen.getByRole('heading', { name: 'Calendario' })).toBeInTheDocument();
  });

  it('muestra las pestañas "Próximos eventos" y "Calendario"', async () => {
    render(<CalendarPage />);
    expect(screen.getByRole('button', { name: 'Próximos eventos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Calendario' })).toBeInTheDocument();
  });

  it('carga y muestra un evento en la pestaña de lista', async () => {
    render(<CalendarPage />);
    await waitFor(() => {
      expect(screen.getByText('Reunión de equipo')).toBeInTheDocument();
    });
  });

  it('muestra el botón + Nuevo evento', () => {
    render(<CalendarPage />);
    expect(screen.getByText('+ Nuevo evento')).toBeInTheDocument();
  });

  it('cambia a la pestaña Calendario al hacer click', async () => {
    render(<CalendarPage />);
    await waitFor(() => screen.getByText('Reunión de equipo'));
    fireEvent.click(screen.getByRole('button', { name: 'Calendario' }));
    await waitFor(() => {
      expect(screen.getByTestId('rbc-calendar')).toBeInTheDocument();
    });
  });

  it('abre modal de creación al click en + Nuevo evento', async () => {
    render(<CalendarPage />);
    await waitFor(() => screen.getByText('Reunión de equipo'));
    fireEvent.click(screen.getByText('+ Nuevo evento'));
    await waitFor(() => {
      expect(screen.getByText('Nuevo evento')).toBeInTheDocument();
    });
  });

  it('muestra mensaje vacío si no hay eventos', async () => {
    const { fetchCalendarEvents } = await import('../services/api');
    vi.mocked(fetchCalendarEvents).mockResolvedValueOnce([]);
    render(<CalendarPage />);
    await waitFor(() => {
      expect(screen.getByText(/No hay eventos próximos/)).toBeInTheDocument();
    });
  });
});
