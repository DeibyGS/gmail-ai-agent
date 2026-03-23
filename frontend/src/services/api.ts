import axios from 'axios';
import type { Email, EmailStats, CalendarEvent, CreateEventPayload, CategoryStats, DailyStats, SendersStats, ProcessedEmail, AppConfig } from '../types';

/** Extrae el campo `detail` de un error de axios, o devuelve el fallback. */
export function getApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.detail) {
    return String(err.response.data.detail);
  }
  return fallback;
}

// Base URL del backend FastAPI (CORS ya configurado para este origen)
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

// El backend envuelve los arrays en objetos: { emails: [...] }, { events: [...] }
// Por eso extraemos la propiedad correspondiente en cada función

export const fetchEmails = async (): Promise<Email[]> => {
  const { data } = await api.get<{ emails: Email[] }>('/emails');
  return data.emails;
};

export const fetchStats = async (): Promise<EmailStats> => {
  const { data } = await api.get<EmailStats>('/emails/stats');
  return data;
};

export const fetchCalendarEvents = async (): Promise<CalendarEvent[]> => {
  const { data } = await api.get<{ events: CalendarEvent[] }>('/calendar/events');
  return data.events;
};

export const fetchProcessedEmails = async (
  view: 'today' | 'history' = 'today',
  since?: string,
  category?: string,
): Promise<ProcessedEmail[]> => {
  const params: Record<string, unknown> = { view };
  if (since) params.since = since;
  if (category) params.category = category;
  const { data } = await api.get<{ emails: ProcessedEmail[] }>('/emails/processed', { params });
  return data.emails;
};

export const fetchCategoryStats = async (since?: string): Promise<CategoryStats> => {
  const params = since ? { since } : {};
  const { data } = await api.get<CategoryStats>('/stats/categories', { params });
  return data;
};

export const fetchDailyStats = async (days = 30): Promise<DailyStats> => {
  const { data } = await api.get<DailyStats>('/stats/daily', { params: { days } });
  return data;
};

export const fetchTopSenders = async (limit = 10, since?: string): Promise<SendersStats> => {
  const params: Record<string, unknown> = { limit };
  if (since) params.since = since;
  const { data } = await api.get<SendersStats>('/stats/senders', { params });
  return data;
};

export const triggerProcess = async (): Promise<void> => {
  await api.post('/process');
};

export const createCalendarEvent = async (payload: CreateEventPayload): Promise<CalendarEvent> => {
  const { data } = await api.post<{ event: CalendarEvent }>('/calendar/events', payload);
  return data.event;
};

export const deleteCalendarEvent = async (eventId: string): Promise<void> => {
  await api.delete(`/calendar/events/${eventId}`);
};

export const fetchConfig = async (): Promise<AppConfig> => {
  const { data } = await api.get<AppConfig>('/config');
  return data;
};

export const updateConfig = async (patch: Partial<AppConfig>): Promise<AppConfig> => {
  const { data } = await api.patch<AppConfig>('/config', patch);
  return data;
};
