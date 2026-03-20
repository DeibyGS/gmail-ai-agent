import axios from 'axios';
import type { Email, EmailStats, CalendarEvent, CreateEventPayload } from '../types';

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

export const triggerProcess = async (): Promise<void> => {
  await api.post('/process');
};

export const createCalendarEvent = async (payload: CreateEventPayload): Promise<CalendarEvent> => {
  const { data } = await api.post<CalendarEvent>('/calendar/events', payload);
  return data;
};
