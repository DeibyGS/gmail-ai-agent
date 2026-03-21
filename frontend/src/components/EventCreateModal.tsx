import { useState } from 'react';
import type { CreateEventPayload, EventMeta } from '../types';
import { theme, btnStyles } from '../theme';

// Etiquetas predefinidas con colores adaptados al dark theme
export const LABEL_OPTIONS: EventMeta[] = [
  { label: 'reunion',   color: '#6366F1' },
  { label: 'trabajo',   color: '#22D3EE' },
  { label: 'personal',  color: '#34D399' },
  { label: 'urgente',   color: '#F87171' },
  { label: 'otro',      color: '#6B7280' },
];

interface Props {
  initialDate?: string;  // YYYY-MM-DD
  onConfirm: (payload: CreateEventPayload, meta: EventMeta) => void;
  onClose: () => void;
}

export default function EventCreateModal({ initialDate = '', onConfirm, onClose }: Props) {
  const [title, setTitle]             = useState('');
  const [date, setDate]               = useState(initialDate);
  const [time, setTime]               = useState('');
  const [location, setLocation]       = useState('');
  const [description, setDesc]        = useState('');
  const [selectedLabel, setLabel]     = useState<EventMeta>(LABEL_OPTIONS[0]);
  const [customColor, setCustomColor] = useState('');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const activeMeta: EventMeta = customColor
    ? { label: selectedLabel.label, color: customColor }
    : selectedLabel;

  const handleSubmit = async () => {
    if (!title.trim() || !date) {
      setError('Título y fecha son obligatorios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: CreateEventPayload = {
        title: title.trim(),
        date,
        time: time || undefined,
        location: location || undefined,
        description: description || undefined,
      };
      onConfirm(payload, activeMeta);
    } catch {
      setError('Error al crear el evento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <h2 style={modalTitle}>Nuevo evento</h2>

        <label style={labelStyle}>Título *</label>
        <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Reunión con equipo" />

        <div style={row}>
          <div style={col}>
            <label style={labelStyle}>Fecha *</label>
            <input style={inputStyle} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div style={col}>
            <label style={labelStyle}>Hora (opcional)</label>
            <input style={inputStyle} type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>

        <label style={labelStyle}>Ubicación</label>
        <input style={inputStyle} value={location} onChange={e => setLocation(e.target.value)} placeholder="Sala A / Meet link..." />

        <label style={labelStyle}>Descripción</label>
        <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={description} onChange={e => setDesc(e.target.value)} />

        <label style={labelStyle}>Etiqueta</label>
        <div style={labelRow}>
          {LABEL_OPTIONS.map(opt => (
            <button
              key={opt.label}
              onClick={() => { setLabel(opt); setCustomColor(''); }}
              style={{
                ...labelBtn,
                background: opt.color,
                outline: selectedLabel.label === opt.label && !customColor
                  ? `2px solid ${theme.colors.textPrimary}`
                  : 'none',
                outlineOffset: '2px',
              }}
              title={opt.label}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label style={labelStyle}>Color personalizado</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="color"
            value={customColor || selectedLabel.color}
            onChange={e => setCustomColor(e.target.value)}
            style={{ width: '40px', height: '32px', border: 'none', cursor: 'pointer', background: 'none' }}
          />
          {customColor && (
            <span style={{ fontSize: '0.8rem', color: theme.colors.textMuted, fontFamily: theme.fonts.mono }}>
              Color libre activo
            </span>
          )}
        </div>

        {error && (
          <p style={{ color: theme.colors.danger, fontFamily: theme.fonts.body, fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
            {error}
          </p>
        )}

        <div style={actionsRow}>
          <button className="btn-secondary" style={btnStyles.secondary} onClick={onClose}>Cancelar</button>
          <button
            className="btn-primary"
            style={{ ...btnStyles.primary, opacity: saving ? 0.6 : 1 }}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Crear evento'}
          </button>
        </div>
      </div>
    </div>
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
  padding: '1.5rem',
  width: '100%',
  maxWidth: '480px',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: theme.shadows.modal,
};
const modalTitle: React.CSSProperties = {
  margin: '0 0 1.25rem',
  fontFamily: theme.fonts.heading,
  fontSize: '1.1rem',
  fontWeight: 700,
  color: theme.colors.textPrimary,
};
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: theme.fonts.body,
  fontSize: '0.82rem',
  color: theme.colors.textSecondary,
  fontWeight: 600,
  marginBottom: '0.3rem',
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: theme.colors.bg,
  border: `1px solid rgba(255,255,255,0.12)`,
  borderRadius: theme.radius.sm,
  padding: '0.45rem 0.75rem',
  fontSize: '0.9rem',
  marginBottom: '1rem',
  color: theme.colors.textPrimary,
  fontFamily: theme.fonts.body,
};
const row: React.CSSProperties    = { display: 'flex', gap: '0.75rem' };
const col: React.CSSProperties    = { flex: 1 };
const labelRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' };
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
  marginTop: '0.5rem',
};
