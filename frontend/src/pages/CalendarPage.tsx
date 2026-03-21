import { useEffect, useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { toast } from 'sonner';
import type { CalendarEvent, EventMeta, CreateEventPayload } from '../types';
import { fetchCalendarEvents, createCalendarEvent, deleteCalendarEvent } from '../services/api';
import EventCreateModal from '../components/EventCreateModal';
import EventDetailModal from '../components/EventDetailModal';
import EventEditModal from '../components/EventEditModal';
import EventCard from '../components/EventCard';
import { LABEL_OPTIONS } from '../components/EventCreateModal';
import { theme, btnStyles } from '../theme';

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
  const safeEnd = end <= start ? new Date(start.getTime() + 60 * 60 * 1000) : end;
  return { id: ev.id, title: ev.title, start, end: safeEnd, resource: ev };
}

type Tab = 'list' | 'calendar';

// ── Componente principal ──────────────────────────────────────────────────────

export default function CalendarPage() {
  const [events, setEvents]           = useState<CalendarEvent[]>([]);
  const [localMeta, setLocalMeta]     = useState<Record<string, EventMeta>>({});
  const [view, setView]               = useState<View>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [activeTab, setActiveTab]     = useState<Tab>('list');

  // Modales
  const [createSlot, setCreateSlot]   = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [editEvent, setEditEvent]     = useState<CalendarEvent | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCalendarEvents();
      setEvents(data);
      setLocalMeta(prev => {
        const next = { ...prev };
        data.forEach(ev => {
          if (!next[ev.id]) next[ev.id] = LABEL_OPTIONS[0];
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

  // Estilo dinámico para react-big-calendar
  const eventPropGetter = (event: RBCEvent) => {
    const meta = localMeta[event.id] ?? LABEL_OPTIONS[4];
    return {
      style: {
        backgroundColor: meta.color,
        borderColor: meta.color,
        color: '#fff',
        borderRadius: '4px',
        fontSize: '0.8rem',
        fontWeight: 600,
        fontFamily: theme.fonts.body,
      },
    };
  };

  // Handlers compartidos entre pestañas
  const handleSelectSlot = ({ start }: { start: Date }) => {
    setCreateSlot(format(start, 'yyyy-MM-dd'));
  };

  const handleSelectEvent = (event: RBCEvent) => {
    setDetailEvent(event.resource);
  };

  const handleCreate = async (payload: CreateEventPayload, meta: EventMeta) => {
    const toastId = toast.loading('Creando evento...');
    try {
      const created = await createCalendarEvent(payload);
      setEvents(prev => [...prev, created]);
      setLocalMeta(prev => ({ ...prev, [created.id]: meta }));
      toast.success('Evento creado correctamente', { id: toastId });
    } catch {
      toast.error('Error al crear el evento en Google Calendar', { id: toastId });
    } finally {
      setCreateSlot(null);
    }
  };

  const handleDelete = async (id: string) => {
    const toastId = toast.loading('Eliminando evento...');
    try {
      await deleteCalendarEvent(id);
      setEvents(prev => prev.filter(e => e.id !== id));
      setLocalMeta(prev => { const n = { ...prev }; delete n[id]; return n; });
      setDetailEvent(null);
      toast.success('Evento eliminado', { id: toastId });
    } catch {
      toast.error('Error al eliminar el evento', { id: toastId });
    }
  };

  // Editar = DELETE antiguo + POST nuevo
  const handleEdit = async (oldId: string, payload: CreateEventPayload, meta: EventMeta) => {
    const toastId = toast.loading('Guardando cambios...');
    try {
      await deleteCalendarEvent(oldId);
      const created = await createCalendarEvent(payload);
      setEvents(prev => [...prev.filter(e => e.id !== oldId), created]);
      setLocalMeta(prev => {
        const n = { ...prev };
        delete n[oldId];
        return { ...n, [created.id]: meta };
      });
      toast.success('Evento actualizado correctamente', { id: toastId });
    } catch {
      toast.error('Error al guardar los cambios', { id: toastId });
    } finally {
      setEditEvent(null);
    }
  };

  const handleMetaChange = (id: string, meta: EventMeta) => {
    setLocalMeta(prev => ({ ...prev, [id]: meta }));
  };

  const rbcEvents = events.map(toRBC);

  // Ordena los próximos eventos por fecha
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

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
        <button
          className="btn-primary"
          style={btnStyles.primary}
          onClick={() => setCreateSlot(format(new Date(), 'yyyy-MM-dd'))}
        >
          + Nuevo evento
        </button>
      </div>

      {/* ── Pestañas ────────────────────────────────────── */}
      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === 'list' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('list')}
        >
          Próximos eventos
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === 'calendar' ? styles.tabActive : {}) }}
          onClick={() => setActiveTab('calendar')}
        >
          Calendario
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {loading && <p style={styles.info}>Cargando eventos...</p>}

      {/* ── Pestaña: Próximos eventos ────────────────────── */}
      {!loading && activeTab === 'list' && (
        <div style={styles.listWrap}>
          {sortedEvents.length === 0 ? (
            <p style={styles.empty}>No hay eventos próximos. Pulsa + para crear uno.</p>
          ) : (
            sortedEvents.map(ev => (
              <EventCard
                key={ev.id}
                event={ev}
                meta={localMeta[ev.id] ?? LABEL_OPTIONS[4]}
                onEdit={setEditEvent}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      )}

      {/* ── Pestaña: Calendario ─────────────────────────── */}
      {!loading && activeTab === 'calendar' && (
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
          onEdit={setEditEvent}
        />
      )}
      {editEvent !== null && (
        <EventEditModal
          event={editEvent}
          currentMeta={localMeta[editEvent.id] ?? LABEL_OPTIONS[4]}
          onConfirm={handleEdit}
          onClose={() => setEditEvent(null)}
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
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 56px)',
    padding: '1rem 1.5rem',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
    marginBottom: '0.5rem',
  },
  title: {
    margin: 0,
    fontFamily: theme.fonts.heading,
    fontSize: '1.25rem',
    fontWeight: 700,
    marginRight: 'auto',
    color: theme.colors.textPrimary,
  },
  legend: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' },
  chip: {
    color: '#fff',
    borderRadius: theme.radius.pill,
    padding: '2px 10px',
    fontFamily: theme.fonts.mono,
    fontSize: '0.72rem',
    fontWeight: 600,
  },
  tabs: {
    display: 'flex',
    gap: '0',
    marginBottom: '0.75rem',
    borderBottom: `2px solid ${theme.colors.border}`,
  },
  tab: {
    background: 'none',
    border: 'none',
    padding: '0.5rem 1.1rem',
    fontFamily: theme.fonts.body,
    fontSize: '0.875rem',
    cursor: 'pointer',
    color: theme.colors.textMuted,
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
    fontWeight: 500,
    transition: 'color 0.15s ease',
  },
  tabActive: {
    color: '#818CF8',
    borderBottom: `2px solid ${theme.colors.gradientStart}`,
    fontWeight: 700,
  },
  listWrap: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: '2px',
  },
  calendarWrap: {
    flex: 1,
    minHeight: 0,
    background: theme.colors.surface,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.border}`,
    padding: '0.75rem',
    overflow: 'hidden',
  },
  empty: { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: '0.9rem', marginTop: '2rem', textAlign: 'center' },
  info:  { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: '0.9rem' },
  error: { color: theme.colors.danger,    fontFamily: theme.fonts.body, fontSize: '0.9rem' },
};
