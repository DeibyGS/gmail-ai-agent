import type { CalendarEvent, EventMeta } from '../types';

interface Props {
  event: CalendarEvent;
  meta: EventMeta;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
}

// Formatea la hora de un ISO string (ej. "14:30")
function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

// Extrae día y mes abreviado de un ISO string
function fmtDayMonth(iso: string): { day: string; month: string } {
  try {
    const d = new Date(iso);
    return {
      day: d.getDate().toString(),
      month: d.toLocaleString('es-ES', { month: 'short' }).replace('.', ''),
    };
  } catch { return { day: '?', month: '?' }; }
}

export default function EventCard({ event, meta, onEdit, onDelete }: Props) {
  const { day, month } = fmtDayMonth(event.start);
  const startTime = fmtTime(event.start);
  const endTime   = fmtTime(event.end);
  const showTime  = startTime && startTime !== '00:00';

  const handleDelete = () => {
    if (window.confirm(`¿Eliminar "${event.title}" de Google Calendar?`)) {
      onDelete(event.id);
    }
  };

  return (
    <div style={card}>
      {/* Bloque de fecha con color de etiqueta */}
      <div style={{ ...dateBlock, background: meta.color }}>
        <span style={dateDay}>{day}</span>
        <span style={dateMonth}>{month}</span>
      </div>

      {/* Contenido central */}
      <div style={content}>
        <div style={topRow}>
          <span style={title}>{event.title}</span>
          <span style={{ ...badge, background: meta.color }}>{meta.label}</span>
        </div>

        {showTime && (
          <span style={timeText}>🕐 {startTime}{endTime && endTime !== startTime ? ` — ${endTime}` : ''}</span>
        )}

        {event.location && (
          <span style={subText}>📍 {event.location}</span>
        )}

        {event.description && (
          <span style={descText}>{event.description}</span>
        )}
      </div>

      {/* Acciones */}
      <div style={actions}>
        <button style={btnEdit} onClick={() => onEdit(event)} title="Editar evento">
          <PencilIcon />
        </button>
        <button style={btnDelete} onClick={handleDelete} title="Eliminar evento">
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

// ── Iconos SVG inline ─────────────────────────────────────────────────────────

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  display: 'flex', alignItems: 'stretch',
  background: '#fff', border: '1px solid #e5e7eb',
  borderRadius: '8px', overflow: 'hidden',
  marginBottom: '0.6rem',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  transition: 'box-shadow 0.15s',
};
const dateBlock: React.CSSProperties = {
  minWidth: '52px', display: 'flex',
  flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: '0.75rem 0.5rem',
};
const dateDay: React.CSSProperties   = { color: '#fff', fontWeight: 700, fontSize: '1.4rem', lineHeight: 1 };
const dateMonth: React.CSSProperties = { color: '#fff', fontSize: '0.7rem', textTransform: 'uppercase', marginTop: '2px' };
const content: React.CSSProperties   = { flex: 1, padding: '0.65rem 0.75rem', overflow: 'hidden' };
const topRow: React.CSSProperties    = { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' };
const title: React.CSSProperties     = { fontWeight: 600, fontSize: '0.9rem', color: '#111827', flex: 1, minWidth: 0 };
const badge: React.CSSProperties     = {
  color: '#fff', borderRadius: '999px', padding: '1px 8px',
  fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap',
};
const timeText: React.CSSProperties  = { display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.15rem' };
const subText: React.CSSProperties   = { display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.15rem' };
const descText: React.CSSProperties  = {
  display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
  overflow: 'hidden', fontSize: '0.78rem', color: '#9ca3af', marginTop: '0.2rem',
} as React.CSSProperties;
const actions: React.CSSProperties   = {
  display: 'flex', flexDirection: 'column', justifyContent: 'center',
  gap: '0.3rem', padding: '0.5rem 0.6rem',
};
const btnEdit: React.CSSProperties   = {
  background: '#f3f4f6', border: '1px solid #e5e7eb',
  borderRadius: '5px', padding: '5px 7px', cursor: 'pointer',
  color: '#374151', display: 'flex', alignItems: 'center',
};
const btnDelete: React.CSSProperties = {
  background: '#fef2f2', border: '1px solid #fca5a5',
  borderRadius: '5px', padding: '5px 7px', cursor: 'pointer',
  color: '#ef4444', display: 'flex', alignItems: 'center',
};
