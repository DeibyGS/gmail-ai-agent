import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import EmailsPage from '../pages/EmailsPage';

// Mock de la capa de servicios API
vi.mock('../services/api', () => ({
  fetchEmails: vi.fn(),
  fetchProcessedEmails: vi.fn(),
  triggerProcess: vi.fn(),
}));

import {
  fetchEmails,
  fetchProcessedEmails,
  triggerProcess,
} from '../services/api';

const mockEmail = {
  id: 'email-1',
  subject: 'Reunión de presupuesto',
  sender: 'jefe@empresa.com',
  category: 'reunion',
  summary: 'Revisión del Q2.',
};

const mockProcessed = {
  id: 1,
  email_id: 'email-2',
  subject: 'Oferta flash',
  sender: 'promo@tienda.com',
  category: 'promocion',
  summary: 'Descuento 50%.',
  processed_at: '2026-03-23T10:30:00',
  day: '2026-03-23',
};

beforeEach(() => {
  vi.mocked(fetchEmails).mockResolvedValue([]);
  vi.mocked(fetchProcessedEmails).mockResolvedValue([]);
  vi.mocked(triggerProcess).mockResolvedValue(undefined);
});

afterEach(() => vi.clearAllMocks());

describe('EmailsPage — renderizado inicial', () => {
  it('muestra el encabezado "Correos"', async () => {
    render(<EmailsPage />);
    expect(screen.getByRole('heading', { name: 'Correos' })).toBeInTheDocument();
  });

  it('muestra las tres pestañas', async () => {
    render(<EmailsPage />);
    expect(screen.getByRole('button', { name: /Pendientes/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Procesados hoy/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Historial' })).toBeInTheDocument();
  });

  it('muestra el botón "Procesar ahora"', () => {
    render(<EmailsPage />);
    expect(screen.getByRole('button', { name: 'Procesar ahora' })).toBeInTheDocument();
  });
});

describe('EmailsPage — tab Pendientes', () => {
  it('muestra spinner mientras carga', () => {
    // fetchEmails nunca resuelve → loading permanece true
    vi.mocked(fetchEmails).mockImplementationOnce(() => new Promise(() => {}));
    render(<EmailsPage />);
    expect(screen.getByText('Cargando correos pendientes...')).toBeInTheDocument();
  });

  it('muestra EmptyInboxCard cuando no hay correos pendientes', async () => {
    vi.mocked(fetchEmails).mockResolvedValueOnce([]);
    render(<EmailsPage />);
    await waitFor(() => {
      expect(screen.getByText('¡Todo al día!')).toBeInTheDocument();
    });
  });

  it('muestra EmailCard por cada correo pendiente', async () => {
    vi.mocked(fetchEmails).mockResolvedValueOnce([mockEmail]);
    render(<EmailsPage />);
    await waitFor(() => {
      expect(screen.getByText('Reunión de presupuesto')).toBeInTheDocument();
      expect(screen.getByText('De: jefe@empresa.com')).toBeInTheDocument();
    });
  });

  it('muestra el contador en la pestaña cuando hay pendientes', async () => {
    vi.mocked(fetchEmails).mockResolvedValueOnce([mockEmail]);
    render(<EmailsPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pendientes (1)' })).toBeInTheDocument();
    });
  });

  it('muestra error si fetchEmails falla', async () => {
    vi.mocked(fetchEmails).mockRejectedValueOnce(new Error('Network error'));
    render(<EmailsPage />);
    await waitFor(() => {
      expect(screen.getByText('No se pudo conectar con el backend.')).toBeInTheDocument();
    });
  });
});

describe('EmailsPage — tab Procesados hoy', () => {
  it('carga correos procesados al cambiar a la pestaña', async () => {
    vi.mocked(fetchEmails).mockResolvedValue([]);
    vi.mocked(fetchProcessedEmails).mockResolvedValueOnce([mockProcessed]);
    render(<EmailsPage />);
    await waitFor(() => screen.getByText('¡Todo al día!'));

    fireEvent.click(screen.getByRole('button', { name: /Procesados hoy/ }));
    await waitFor(() => {
      expect(screen.getByText('Oferta flash')).toBeInTheDocument();
    });
  });

  it('muestra mensaje vacío si no hay procesados hoy', async () => {
    vi.mocked(fetchEmails).mockResolvedValue([]);
    vi.mocked(fetchProcessedEmails).mockResolvedValue([]);
    render(<EmailsPage />);
    await waitFor(() => screen.getByText('¡Todo al día!'));

    fireEvent.click(screen.getByRole('button', { name: /Procesados hoy/ }));
    await waitFor(() => {
      expect(screen.getByText(/Pulsa "Procesar ahora"/)).toBeInTheDocument();
    });
  });

  it('muestra spinner al cargar la pestaña hoy', async () => {
    vi.mocked(fetchEmails).mockResolvedValue([]);
    vi.mocked(fetchProcessedEmails).mockImplementation(
      () => new Promise(() => {}),
    );
    render(<EmailsPage />);
    await waitFor(() => screen.getByText('¡Todo al día!'));

    fireEvent.click(screen.getByRole('button', { name: /Procesados hoy/ }));
    expect(screen.getByText('Cargando correos de hoy...')).toBeInTheDocument();
  });
});

describe('EmailsPage — tab Historial', () => {
  it('muestra filtros de fecha y categoría', async () => {
    vi.mocked(fetchEmails).mockResolvedValue([]);
    vi.mocked(fetchProcessedEmails).mockResolvedValue([]);
    render(<EmailsPage />);
    await waitFor(() => screen.getByText('¡Todo al día!'));

    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    await waitFor(() => {
      expect(screen.getByTitle('Filtrar desde fecha')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  it('muestra EmptyHistoryCard variante "empty" cuando no hay historial', async () => {
    vi.mocked(fetchEmails).mockResolvedValue([]);
    vi.mocked(fetchProcessedEmails).mockResolvedValue([]);
    render(<EmailsPage />);
    await waitFor(() => screen.getByText('¡Todo al día!'));

    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    await waitFor(() => {
      expect(screen.getByText('Aún no hay historial')).toBeInTheDocument();
    });
  });

  it('muestra correos en el historial cuando hay resultados', async () => {
    vi.mocked(fetchEmails).mockResolvedValue([]);
    vi.mocked(fetchProcessedEmails).mockResolvedValue([mockProcessed]);
    render(<EmailsPage />);
    await waitFor(() => screen.getByText('¡Todo al día!'));

    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    await waitFor(() => {
      expect(screen.getByText('Oferta flash')).toBeInTheDocument();
    });
  });

  it('muestra variante "sin resultados" cuando hay filtros pero historia vacía', async () => {
    vi.mocked(fetchEmails).mockResolvedValue([]);
    // Primera llamada (sin filtros) devuelve historial vacío
    // Segunda llamada (con filtro) también vacía → debe mostrar "Sin resultados"
    vi.mocked(fetchProcessedEmails).mockResolvedValue([]);
    render(<EmailsPage />);
    await waitFor(() => screen.getByText('¡Todo al día!'));

    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    await waitFor(() => screen.getByText('Aún no hay historial'));

    // Aplicar filtro de categoría
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'reunion' } });
    await waitFor(() => {
      expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    });
  });

  it('muestra el botón "Limpiar" cuando hay filtros activos', async () => {
    vi.mocked(fetchEmails).mockResolvedValue([]);
    vi.mocked(fetchProcessedEmails).mockResolvedValue([]);
    render(<EmailsPage />);
    await waitFor(() => screen.getByText('¡Todo al día!'));

    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    await waitFor(() => screen.getByText('Aún no hay historial'));

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'urgente' } });
    await waitFor(() => {
      expect(screen.getByText('Limpiar')).toBeInTheDocument();
    });
  });
});

describe('EmailsPage — acción Procesar ahora', () => {
  it('llama a triggerProcess y recarga datos al pulsar el botón', async () => {
    vi.mocked(fetchEmails).mockResolvedValue([]);
    vi.mocked(fetchProcessedEmails).mockResolvedValue([mockProcessed]);
    vi.mocked(triggerProcess).mockResolvedValue(undefined);
    render(<EmailsPage />);
    await waitFor(() => screen.getByText('¡Todo al día!'));

    fireEvent.click(screen.getByRole('button', { name: 'Procesar ahora' }));
    await waitFor(() => {
      expect(triggerProcess).toHaveBeenCalledTimes(1);
    });
  });

  it('muestra error si triggerProcess falla', async () => {
    vi.mocked(fetchEmails).mockResolvedValue([]);
    vi.mocked(fetchProcessedEmails).mockResolvedValue([]);
    vi.mocked(triggerProcess).mockRejectedValueOnce(new Error('fail'));
    render(<EmailsPage />);
    await waitFor(() => screen.getByText('¡Todo al día!'));

    fireEvent.click(screen.getByRole('button', { name: 'Procesar ahora' }));
    await waitFor(() => {
      expect(screen.getByText('Error al procesar correos.')).toBeInTheDocument();
    });
  });
});
