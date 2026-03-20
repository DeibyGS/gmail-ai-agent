import { useEffect, useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import type { CalendarEvent, EventMeta, CreateEventPayload } from '../types';
import { fetchCalendarEvents, createCalendarEvent, deleteCalendarEvent } from '../services/api';
import EventCreateModal from '../components/EventCreateModal';
import EventDetailModal from '../components/EventDetailModal';
import { LABEL_OPTIONS } from '../components/EventCreateModal';

// ── Configuración del localizador de fechas ───────────────────────────────────
const locales = { es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// Tipo interno que necesita react-big-calendar
interface RBCEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: CalendarEvent;
}

// Convierte un CalendarEvent de la API al formato que usa react-big-calendar
function toRBC(ev: CalendarEvent): RBCEvent {
  const start = new Date(ev.start);
  const end   = new Date(ev.end);
  // Si start === end (evento de día completo sin hora), ajustamos end a +1h
  const safeEnd = end <= start ? new Date(start.getTime() + 60 * 60 * 1000) : end;
  return { id: ev.id, title: ev.title, start, end: safeEnd, resource: ev };
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CalendarPage() {
  const [events, setEvents]             = useState<CalendarEvent[]>([]);
  const [localMeta, setLocalMeta]       = useState<Record<string, EventMeta>>({});
  const [view, setView]                 = useState<View>('month');
  const [currentDate, setCurrentDate]   = useState(new Date());
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  // Modales
  const [createSlot, setCreateSlot]     = useState<string | null>(null);   // fecha YYYY-MM-DD
  const [detailEvent, setDetailEvent]   = useState<CalendarEvent | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCalendarEvents();
      setEvents(data);
      // Asignar etiqueta "reunion" por defecto a eventos sin meta local
      setLocalMeta(prev => {
        const next = { ...prev };
        data.forEach(ev => {
          if (!next[ev.id]) next[ev.id] = LABEL_OPTIONS[0]; // 'reunion' como default
        });
        return next;
      });
    } catch {
      setError('No se pudo cargar los eventos. ¿Está el backend corriendo?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Estilo dinámico de cada evento según su etiqueta/color local
  const eventPropGetter = (event: RBCEvent) => {
    const meta = localMeta[event.id] ?? LABEL_OPTIONS[4]; // 'otro' como fallback
    return {
      style: {
        backgroundColor: meta.color,
        borderColor: meta.color,
        color: '#fff',
        borderRadius: '4px',
        fontSize: '0.8rem',
        fontWeight: 600,
      },
    };
  };

  // Click en slot vacío → abrir modal de creación
  const handleSelectSlot = ({ start }: { start: Date }) => {
    const dateStr = format(start, 'yyyy-MM-dd');
    setCreateSlot(dateStr);
  };

  // Click en evento existente → abrir modal de detalle
  const handleSelectEvent = (event: RBCEvent) => {
    setDetailEvent(event.resource);
  };

  // Confirmar creación de evento
  const handleCreate = async (payload: CreateEventPayload, meta: EventMeta) => {
    try {
      const created = await createCalendarEvent(payload);
      setEvents(prev => [...prev, created]);
      setLocalMeta(prev => ({ ...prev, [created.id]: meta }));
    } catch {
      alert('Error al crear el evento en Google Calendar.');
    } finally {
      setCreateSlot(null);
    }
  };

  // Eliminar evento
  const handleDelete = async (id: string) => {
    try {
      await deleteCalendarEvent(id);
      setEvents(prev => prev.filter(e => e.id !== id));
      setLocalMeta(prev => { const n = { ...prev }; delete n[id]; return n; });
      setDetailEvent(null);
    } catch {
      alert('Error al eliminar el evento.');
    }
  };

  // Cambiar etiqueta/color de un evento localmente
  const handleMetaChange = (id: string, meta: EventMeta) => {
    setLocalMeta(prev => ({ ...prev, [id]: meta }));
  };

  const rbcEvents = events.map(toRBC);

  return (
    <div style={styles.page}>
      {/* ── Header ──────────────────────────────────────── */}
      <div style={styles.header}>
        <h1 style={styles.title}>Calendario</h1>
        <div style={styles.legend}>
          {LABEL_OPTIONS.map(opt => (
            <span key={opt.label} style={{ ...styles.chip, background: opt.color }}>
              {opt.label}
            </span>
          ))}
        </div>
        <button style={styles.btnNew} onClick={() => setCreateSlot(format(new Date(), 'yyyy-MM-dd'))}>
          + Nuevo evento
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {loading && <p style={styles.info}>Cargando eventos...</p>}

      {/* ── Calendario grande ───────────────────────────── */}
      {!loading && (
        <div style={styles.calendarWrap}>
          <Calendar
            localizer={localizer}
            events={rbcEvents}
            view={view}
            onView={setView}
            date={currentDate}
            onNavigate={setCurrentDate}
            selectable
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventPropGetter}
            style={{ height: '100%' }}
            messages={MESSAGES_ES}
            culture="es"
          />
        </div>
      )}

      {/* ── Modales ─────────────────────────────────────── */}
      {createSlot !== null && (
        <EventCreateModal
          initialDate={createSlot}
          onConfirm={handleCreate}
          onClose={() => setCreateSlot(null)}
        />
      )}
      {detailEvent !== null && (
        <EventDetailModal
          event={detailEvent}
          meta={localMeta[detailEvent.id] ?? LABEL_OPTIONS[4]}
          onDelete={handleDelete}
          onClose={() => setDetailEvent(null)}
          onMetaChange={handleMetaChange}
        />
      )}
    </div>
  );
}

// ── Traducciones del calendario a español ─────────────────────────────────────
const MESSAGES_ES = {
  next: 'Siguiente',
  previous: 'Anterior',
  today: 'Hoy',
  month: 'Mes',
  week: 'Semana',
  day: 'Día',
  agenda: 'Agenda',
  date: 'Fecha',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'No hay eventos en este período.',
};

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex', flexDirection: 'column',
    height: 'calc(100vh - 60px)',   // ocupa toda la pantalla menos la navbar
    padding: '1rem 1.5rem', boxSizing: 'border-box',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    flexWrap: 'wrap', marginBottom: '0.75rem',
  },
  title: { margin: 0, fontSize: '1.25rem', fontWeight: 700, marginRight: 'auto' },
  legend: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' },
  chip: {
    color: '#fff', borderRadius: '999px',
    padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600,
  },
  btnNew: {
    background: '#4f46e5', color: '#fff', border: 'none',
    borderRadius: '6px', padding: '0.45rem 1rem',
    cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
  },
  calendarWrap: {
    flex: 1,
    minHeight: 0,
    background: '#fff',
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    padding: '0.75rem',
    overflow: 'hidden',
  },
  info:  { color: '#6b7280', fontSize: '0.9rem' },
  error: { color: '#dc2626', fontSize: '0.9rem' },
};
