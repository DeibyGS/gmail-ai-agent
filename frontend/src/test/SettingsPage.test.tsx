import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import SettingsPage from '../pages/SettingsPage';

vi.mock('../services/api', () => ({
  fetchConfig: vi.fn(),
  updateConfig: vi.fn(),
}));

import { fetchConfig, updateConfig } from '../services/api';

const mockConfig = {
  max_emails_per_run:      100,
  check_interval_minutes:  30,
  gmail_filter_after_date: '2026/03/20',
  quiet_hours_start:       0,
  quiet_hours_end:         8,
};

beforeEach(() => {
  vi.mocked(fetchConfig).mockResolvedValue(mockConfig);
  vi.mocked(updateConfig).mockResolvedValue(mockConfig);
});

afterEach(() => vi.clearAllMocks());

describe('SettingsPage — carga inicial', () => {
  it('muestra spinner mientras carga', () => {
    vi.mocked(fetchConfig).mockImplementationOnce(() => new Promise(() => {}));
    render(<SettingsPage />);
    expect(screen.getByText('Cargando configuración...')).toBeInTheDocument();
  });

  it('muestra error si fetchConfig falla', async () => {
    vi.mocked(fetchConfig).mockRejectedValueOnce(new Error('fail'));
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText(/No se pudo cargar la configuración/)).toBeInTheDocument();
    });
  });

  it('muestra el encabezado "Configuración"', async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Configuración' })).toBeInTheDocument();
    });
  });

  it('muestra los valores actuales en los inputs', async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('100')).toBeInTheDocument();
      expect(screen.getByDisplayValue('30')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2026/03/20')).toBeInTheDocument();
    });
  });

  it('muestra el hint con las horas de descanso configuradas', async () => {
    render(<SettingsPage />);
    await waitFor(() => {
      expect(screen.getByText(/entre las 0:00 y las 8:00/)).toBeInTheDocument();
    });
  });
});

describe('SettingsPage — guardar cambios', () => {
  it('llama a updateConfig con los valores actuales al pulsar Guardar', async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByRole('button', { name: 'Guardar cambios' }));

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => {
      expect(updateConfig).toHaveBeenCalledWith(mockConfig);
    });
  });

  it('muestra mensaje de éxito tras guardar', async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByRole('button', { name: 'Guardar cambios' }));

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => {
      expect(screen.getByText(/Configuración guardada correctamente/)).toBeInTheDocument();
    });
  });

  it('muestra mensaje de error si updateConfig falla', async () => {
    vi.mocked(updateConfig).mockRejectedValueOnce(new Error('Error de servidor'));
    render(<SettingsPage />);
    await waitFor(() => screen.getByRole('button', { name: 'Guardar cambios' }));

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => {
      expect(screen.getByText(/Error de servidor/)).toBeInTheDocument();
    });
  });

  it('deshabilita el botón mientras guarda', async () => {
    vi.mocked(updateConfig).mockImplementationOnce(() => new Promise(() => {}));
    render(<SettingsPage />);
    await waitFor(() => screen.getByRole('button', { name: 'Guardar cambios' }));

    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(screen.getByRole('button', { name: 'Guardando...' })).toBeDisabled();
  });
});

describe('SettingsPage — edición de campos', () => {
  it('actualiza max_emails_per_run al cambiar el input', async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByDisplayValue('100'));

    fireEvent.change(screen.getByDisplayValue('100'), { target: { value: '50' } });
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
  });

  it('actualiza gmail_filter_after_date al cambiar el input', async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByDisplayValue('2026/03/20'));

    fireEvent.change(screen.getByDisplayValue('2026/03/20'), { target: { value: '2026/04/01' } });
    expect(screen.getByDisplayValue('2026/04/01')).toBeInTheDocument();
  });
});
