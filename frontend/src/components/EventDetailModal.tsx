import type { CalendarEvent, EventMeta } from '../types';
import { LABEL_OPTIONS } from './EventCreateModal';

interface Props {
  event: CalendarEvent;
  meta: EventMeta;
  onDelete: (id: string) => void;
  onClose: () => void;
  onMetaChange: (id: string, meta: EventMeta) => void;
}

export default function EventDetailModal({ event, meta, onDelete, onClose, onMetaChange }: Props) {
  const isFromEmail = Boolean(event.description?.includes('📧') || event.description?.toLowerCase().includes('email'));

  const fmt = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        {/* Header con color de la etiqueta */}
        <div style={{ ...header, background: meta.color }}>
          <span style={headerTitle}>{event.title}</span>
          <button style={closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={body}>
          {isFromEmail && (
            <div style={emailBadge}>📧 Creado automáticamente desde un correo</div>
          )}

          <div style={field}>
            <span style={fieldLabel}>Inicio</span>
            <span style={fieldValue}>{fmt(event.start)}</span>
          </div>
          <div style={field}>
            <span style={fieldLabel}>Fin</span>
            <span style={fieldValue}>{fmt(event.end)}</span>
          </div>
          {event.location && (
            <div style={field}>
              <span style={fieldLabel}>Ubicación</span>
              <span style={fieldValue}>📍 {event.location}</span>
            </div>
          )}
          {event.description && (
            <div style={field}>
              <span style={fieldLabel}>Descripción</span>
              <span style={{ ...fieldValue, whiteSpace: 'pre-wrap' }}>{event.description}</span>
            </div>
          )}
          {event.link && (
            <div style={field}>
              <a href={event.link} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', fontSize: '0.85rem' }}>
                Ver en Google Calendar →
              </a>
            </div>
          )}

          {/* Cambiar etiqueta */}
          <div style={{ marginTop: '1rem' }}>
            <span style={fieldLabel}>Etiqueta</span>
            <div style={labelRow}>
              {LABEL_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => onMetaChange(event.id, opt)}
                  style={{
                    ...labelBtn,
                    background: opt.color,
                    outline: meta.color === opt.color ? '2px solid #000' : 'none',
                  }}
                  title={opt.label}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div style={actions}>
          <button
            style={btnDelete}
            onClick={() => { if (window.confirm('¿Eliminar este evento de Google Calendar?')) onDelete(event.id); }}
          >
            Eliminar evento
          </button>
          <button style={btnClose} onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modal: React.CSSProperties = {
  background: '#fff', borderRadius: '10px', overflow: 'hidden',
  width: '100%', maxWidth: '440px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
};
const header: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '1rem 1.25rem',
};
const headerTitle: React.CSSProperties = { color: '#fff', fontWeight: 700, fontSize: '1rem', flex: 1, marginRight: '1rem' };
const closeBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#fff', fontSize: '1.1rem', cursor: 'pointer' };
const body: React.CSSProperties = { padding: '1.25rem' };
const emailBadge: React.CSSProperties = {
  background: '#eff6ff', color: '#2563eb', borderRadius: '6px',
  padding: '0.4rem 0.75rem', fontSize: '0.8rem', marginBottom: '1rem',
};
const field: React.CSSProperties = { marginBottom: '0.65rem' };
const fieldLabel: React.CSSProperties = { display: 'block', fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, marginBottom: '0.1rem' };
const fieldValue: React.CSSProperties = { fontSize: '0.9rem', color: '#111827' };
const labelRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.4rem' };
const labelBtn: React.CSSProperties = {
  color: '#fff', border: 'none', borderRadius: '999px',
  padding: '3px 12px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600,
};
const actions: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: '0.5rem',
  padding: '1rem 1.25rem', borderTop: '1px solid #e5e7eb',
};
const btnDelete: React.CSSProperties = { background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '6px', padding: '0.45rem 1rem', cursor: 'pointer', fontSize: '0.875rem' };
const btnClose: React.CSSProperties = { background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.45rem 1rem', cursor: 'pointer', fontSize: '0.875rem' };
