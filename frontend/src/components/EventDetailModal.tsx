import { useState } from 'react';
import type { CalendarEvent, EventMeta } from '../types';
import { LABEL_OPTIONS } from './EventCreateModal';
import ConfirmModal from './ConfirmModal';
import { theme, btnStyles } from '../theme';

interface Props {
  event: CalendarEvent;
  meta: EventMeta;
  onDelete: (id: string) => void;
  onClose: () => void;
  onMetaChange: (id: string, meta: EventMeta) => void;
  onEdit?: (event: CalendarEvent) => void;
}

export default function EventDetailModal({ event, meta, onDelete, onClose, onMetaChange, onEdit }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isFromEmail = Boolean(
    event.description?.includes('📧') || event.description?.toLowerCase().includes('email')
  );

  const fmt = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('es-ES', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  return (
    <>
    <ConfirmModal
      isOpen={confirmOpen}
      title="Eliminar evento"
      message="¿Eliminar este evento de Google Calendar? Esta acción no se puede deshacer."
      onConfirm={() => onDelete(event.id)}
      onClose={() => setConfirmOpen(false)}
    />
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
              <a
                href={event.link}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: theme.colors.gradientStart, fontSize: '0.85rem', fontFamily: theme.fonts.body }}
              >
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
                    outline: meta.color === opt.color ? `2px solid ${theme.colors.textPrimary}` : 'none',
                    outlineOffset: '2px',
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
        <div style={actionsRow}>
          <button
            className="btn-danger"
            style={btnStyles.danger}
            onClick={() => setConfirmOpen(true)}
          >
            Eliminar
          </button>
          {onEdit && (
            <button className="btn-secondary" style={btnStyles.secondary} onClick={() => { onClose(); onEdit(event); }}>
              Editar
            </button>
          )}
          <button className="btn-primary" style={btnStyles.primary} onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
    </>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.75)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};
const modal: React.CSSProperties = {
  background: theme.colors.surface,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.radius.lg,
  overflow: 'hidden',
  width: '100%',
  maxWidth: '440px',
  boxShadow: theme.shadows.modal,
};
const header: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem 1.25rem',
};
const headerTitle: React.CSSProperties = {
  color: '#fff',
  fontFamily: theme.fonts.heading,
  fontWeight: 700,
  fontSize: '1rem',
  flex: 1,
  marginRight: '1rem',
};
const closeBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#fff',
  fontSize: '1.1rem',
  cursor: 'pointer',
};
const body: React.CSSProperties = { padding: '1.25rem' };
const emailBadge: React.CSSProperties = {
  background: 'rgba(99,102,241,0.12)',
  color: '#818CF8',
  border: '1px solid rgba(99,102,241,0.3)',
  borderRadius: theme.radius.sm,
  padding: '0.4rem 0.75rem',
  fontFamily: theme.fonts.mono,
  fontSize: '0.8rem',
  marginBottom: '1rem',
};
const field: React.CSSProperties      = { marginBottom: '0.65rem' };
const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontFamily: theme.fonts.body,
  fontSize: '0.75rem',
  color: theme.colors.textMuted,
  fontWeight: 600,
  marginBottom: '0.1rem',
};
const fieldValue: React.CSSProperties = {
  fontFamily: theme.fonts.body,
  fontSize: '0.9rem',
  color: theme.colors.textPrimary,
};
const labelRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.4rem' };
const labelBtn: React.CSSProperties = {
  color: '#fff',
  border: 'none',
  borderRadius: theme.radius.pill,
  padding: '3px 12px',
  fontFamily: theme.fonts.mono,
  fontSize: '0.78rem',
  cursor: 'pointer',
  fontWeight: 600,
};
const actionsRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.5rem',
  padding: '1rem 1.25rem',
  borderTop: `1px solid ${theme.colors.border}`,
};
