// Categoría que Gemini asigna a cada correo — puede ser cualquier string que el modelo decida
export type EmailCategory = string;

// Datos opcionales que Gemini extrae si el correo es una reunión
export interface EventData {
  title: string;
  date?: string;
  time?: string;
  location?: string;
  description?: string;
  recurrence?: string | null;
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
  link?: string;
  recurrence?: string[] | null;  // Lista de RRULE strings, ej: ["RRULE:FREQ=WEEKLY;BYDAY=MO"]
}

// Metadatos locales del evento (color + etiqueta — no se persisten en backend)
export interface EventMeta {
  color: string;
  label: string;
}

// Correo ya procesado y guardado en SQLite
export interface ProcessedEmail {
  id: number;
  email_id: string;
  subject: string;
  sender: string;
  category: EmailCategory;
  summary: string;
  processed_at: string;
  day: string;
}

// Estadísticas históricas por categoría (SQLite)
export interface CategoryStats {
  total: number;
  by_category: Record<string, number>;
  fetched_at: string;
}

// Volumen diario de correos
export interface DailyVolume {
  day: string;
  total: number;
  by_category: Record<string, number>;
}

export interface DailyStats {
  daily: DailyVolume[];
  fetched_at: string;
}

// Top remitentes
export interface SenderStat {
  sender: string;
  count: number;
}

export interface SendersStats {
  senders: SenderStat[];
  fetched_at: string;
}

// Configuración operativa del agente — GET/PATCH /api/config
export interface AppConfig {
  max_emails_per_run:      number;
  check_interval_minutes:  number;
  gmail_filter_after_date: string;
  quiet_hours_start:       number;
  quiet_hours_end:         number;
}

// Briefing diario — respuesta de GET /api/briefing
export interface BriefingUrgent {
  subject: string;
  sender:  string;
  action:  string;
}

export interface BriefingMeeting {
  subject: string;
  sender:  string;
  note:    string;
}

export interface BriefingData {
  date:             string;
  total:            number;
  summary:          string;
  urgent_emails:    BriefingUrgent[];
  pending_meetings: BriefingMeeting[];
  by_category:      Record<string, number>;
  recommendations:  string[];
  generated_at:     string;
}

// Body para POST /api/calendar/events
export interface CreateEventPayload {
  title: string;
  date: string;        // YYYY-MM-DD
  time?: string;       // HH:MM (opcional — sin hora = evento de día completo)
  location?: string;
  description?: string;
}
