// Categoría que Gemini asigna a cada correo — puede ser cualquier string que el modelo decida
export type EmailCategory = string;

// Datos opcionales que Gemini extrae si el correo es una reunión
export interface EventData {
  title: string;
  date?: string;
  time?: string;
  location?: string;
}

// Correo clasificado devuelto por GET /api/emails
export interface Email {
  id: string;
  subject: string;
  sender: string;
  category: EmailCategory;
  summary: string;
  event_data?: EventData | null;
}

// Respuesta de GET /api/emails/stats
export interface EmailStats {
  total: number;
  by_category: Record<string, number>; // clave dinámica según lo que Gemini clasifique
  fetched_at: string;
}

// Evento de Google Calendar devuelto por GET /api/calendar/events
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
}

// Body para POST /api/calendar/events
export interface CreateEventPayload {
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
}
