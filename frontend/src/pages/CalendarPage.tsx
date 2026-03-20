import { useEffect, useState } from 'react';
import type { CalendarEvent } from '../types';
import { fetchCalendarEvents } from '../services/api';

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchCalendarEvents();
        setEvents(data);
      } catch {
        setError('No se pudo conectar con el backend. ¿Está corriendo en el puerto 8000?');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Próximos eventos</h1>

      {loading && <p style={styles.info}>Cargando eventos...</p>}
      {error && <p style={styles.error}>{error}</p>}

      {!loading && !error && events.length === 0 && (
        <p style={styles.info}>No hay eventos en los próximos 30 días.</p>
      )}

      <div style={styles.list}>
        {events.map(event => (
          <div key={event.id} style={styles.card}>
            <div style={styles.dateBlock}>
              {/* Mostramos día y mes del evento de forma visual */}
              <span style={styles.day}>
                {new Date(event.start).toLocaleDateString('es-ES', { day: '2-digit' })}
              </span>
              <span style={styles.month}>
                {new Date(event.start).toLocaleDateString('es-ES', { month: 'short' })}
              </span>
            </div>
            <div style={styles.info2}>
              <p style={styles.eventTitle}>{event.title}</p>
              <p style={styles.time}>
                {new Date(event.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                {' — '}
                {new Date(event.end).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
              {event.location && <p style={styles.location}>📍 {event.location}</p>}
              {event.description && <p style={styles.description}>{event.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '1.5rem', maxWidth: '760px', margin: '0 auto' },
  title: { margin: '0 0 1.25rem', fontSize: '1.25rem', fontWeight: 700 },
  list: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1rem 1.25rem',
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start',
  },
  dateBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '40px',
    background: '#eff6ff',
    borderRadius: '6px',
    padding: '6px 10px',
  },
  day: { fontSize: '1.3rem', fontWeight: 700, color: '#2563eb', lineHeight: 1 },
  month: { fontSize: '0.72rem', color: '#2563eb', textTransform: 'uppercase' },
  info2: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  eventTitle: { margin: 0, fontWeight: 600, fontSize: '0.95rem', color: '#111827' },
  time: { margin: 0, fontSize: '0.82rem', color: '#6b7280' },
  location: { margin: 0, fontSize: '0.82rem', color: '#374151' },
  description: { margin: 0, fontSize: '0.82rem', color: '#9ca3af' },
  info: { color: '#6b7280', fontSize: '0.9rem' },
  error: { color: '#dc2626', fontSize: '0.9rem' },
};
