import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import StatsPage from '../pages/StatsPage';
import type { DailyStats } from '../types';

// Mock de recharts — jsdom no soporta SVG/canvas; reemplazamos con divs simples
vi.mock('recharts', () => ({
  PieChart:          ({ children }: { children?: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie:               () => <div data-testid="pie" />,
  Cell:              () => null,
  Tooltip:           () => null,
  Legend:            () => null,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ComposedChart:     ({ children }: { children?: React.ReactNode }) => <div data-testid="composed-chart">{children}</div>,
  BarChart:          ({ children }: { children?: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar:               () => null,
  Line:              () => null,
  XAxis:             () => null,
  YAxis:             () => null,
  CartesianGrid:     () => null,
}));

// Mock de la capa de servicios API
vi.mock('../services/api', () => ({
  fetchCategoryStats: vi.fn(),
  fetchDailyStats:    vi.fn(),
  fetchTopSenders:    vi.fn(),
}));

import {
  fetchCategoryStats,
  fetchDailyStats,
  fetchTopSenders,
} from '../services/api';

const mockCategoryStats = {
  total: 42,
  by_category: { reunion: 10, urgente: 8, informativo: 15, promocion: 9 },
  fetched_at: '2026-03-23T12:00:00',
};

const mockDailyStats: DailyStats = {
  daily: [
    { day: '2026-03-20', total: 5, by_category: { reunion: 2, urgente: 3 } },
    { day: '2026-03-21', total: 3, by_category: { informativo: 3 } },
  ],
  fetched_at: '2026-03-23T12:00:00',
};

const mockSendersStats = {
  senders: [
    { sender: 'boss@corp.com', count: 12 },
    { sender: 'news@digest.io', count: 8 },
  ],
  fetched_at: '2026-03-23T12:00:00',
};

beforeEach(() => {
  vi.mocked(fetchCategoryStats).mockResolvedValue(mockCategoryStats);
  vi.mocked(fetchDailyStats).mockResolvedValue(mockDailyStats);
  vi.mocked(fetchTopSenders).mockResolvedValue(mockSendersStats);
});

afterEach(() => vi.clearAllMocks());

describe('StatsPage — estado loading', () => {
  it('muestra el spinner mientras carga', () => {
    vi.mocked(fetchCategoryStats).mockImplementationOnce(() => new Promise(() => {}));
    render(<StatsPage />);
    expect(screen.getByText('Cargando estadísticas...')).toBeInTheDocument();
  });
});

describe('StatsPage — estado error', () => {
  it('muestra mensaje de error si alguna petición falla', async () => {
    vi.mocked(fetchCategoryStats).mockRejectedValueOnce(new Error('Network error'));
    render(<StatsPage />);
    await waitFor(() => {
      expect(
        screen.getByText(/No se pudo conectar con el backend/),
      ).toBeInTheDocument();
    });
  });
});

describe('StatsPage — sin datos históricos', () => {
  it('muestra aviso de sin datos cuando total es 0', async () => {
    vi.mocked(fetchCategoryStats).mockResolvedValueOnce({
      total: 0,
      by_category: {},
      fetched_at: '2026-03-23T12:00:00',
    });
    render(<StatsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Aún no hay datos históricos/)).toBeInTheDocument();
    });
  });

  it('no muestra KPI cards cuando total es 0', async () => {
    vi.mocked(fetchCategoryStats).mockResolvedValueOnce({
      total: 0,
      by_category: {},
      fetched_at: '2026-03-23T12:00:00',
    });
    render(<StatsPage />);
    await waitFor(() => screen.getByText(/Aún no hay datos históricos/));
    expect(screen.queryByTestId('pie-chart')).not.toBeInTheDocument();
  });
});

describe('StatsPage — con datos', () => {
  it('muestra el encabezado "Estadísticas"', async () => {
    render(<StatsPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Estadísticas' })).toBeInTheDocument();
    });
  });

  it('muestra el total histórico de correos procesados', async () => {
    render(<StatsPage />);
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  it('muestra una KPI card por cada categoría', async () => {
    render(<StatsPage />);
    await waitFor(() => {
      expect(screen.getByText('reunion')).toBeInTheDocument();
      expect(screen.getByText('urgente')).toBeInTheDocument();
      expect(screen.getByText('informativo')).toBeInTheDocument();
      expect(screen.getByText('promocion')).toBeInTheDocument();
    });
  });

  it('muestra el conteo por categoría en las KPI cards', async () => {
    render(<StatsPage />);
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // reunion
      expect(screen.getByText('15')).toBeInTheDocument(); // informativo
    });
  });

  it('renderiza el gráfico de distribución por categoría (donut)', async () => {
    render(<StatsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });
  });

  it('renderiza el gráfico de volumen diario (barras + línea)', async () => {
    render(<StatsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    });
  });

  it('renderiza el gráfico de top remitentes (barras horizontales)', async () => {
    render(<StatsPage />);
    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  it('muestra el título "Top remitentes"', async () => {
    render(<StatsPage />);
    await waitFor(() => {
      expect(screen.getByText('Top remitentes')).toBeInTheDocument();
    });
  });
});

describe('StatsPage — sin datos de días ni remitentes', () => {
  it('muestra mensaje cuando dailyData está vacío', async () => {
    vi.mocked(fetchDailyStats).mockResolvedValueOnce({
      daily: [],
      fetched_at: '2026-03-23T12:00:00',
    });
    vi.mocked(fetchTopSenders).mockResolvedValueOnce({
      senders: [],
      fetched_at: '2026-03-23T12:00:00',
    });
    render(<StatsPage />);
    await waitFor(() => {
      expect(screen.getByText('Sin datos de días anteriores aún.')).toBeInTheDocument();
    });
  });

  it('no renderiza el gráfico de remitentes cuando la lista está vacía', async () => {
    vi.mocked(fetchTopSenders).mockResolvedValueOnce({
      senders: [],
      fetched_at: '2026-03-23T12:00:00',
    });
    render(<StatsPage />);
    await waitFor(() => screen.getByText('Estadísticas'));
    expect(screen.queryByText('Top remitentes')).not.toBeInTheDocument();
  });
});
