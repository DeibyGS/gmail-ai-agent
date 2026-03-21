import { useState } from 'react';
import type { CalendarEvent, CreateEventPayload, EventMeta } from '../types';
import { LABEL_OPTIONS } from './EventCreateModal';
import { theme, btnStyles } from '../theme';

// Extrae YYYY-MM-DD de un ISO string
function toDateStr(iso: string): string {
  try { return new Date(iso).toISOString().slice(0, 10); } catch { return ''; }
}

// Extrae HH:MM de un ISO string (vacío si no tiene hora concreta)
function toTimeStr(iso: string): string {
  try {
    const d = new Date(iso);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return (h === '00' && m === '00') ? '' : `${h}:${m}`;
  } catch { return ''; }
}

interface Props {
  event: CalendarEvent;
  currentMeta: EventMeta;
  onConfirm: (oldId: string, payload: CreateEventPayload, meta: EventMeta) => void;
  onClose: () => void;
}

export default function EventEditModal({ event, currentMeta, onConfirm, onClose }: Props) {
  const [title, setTitle]             = useState(event.title);
  const [date, setDate]               = useState(toDateStr(event.start));
  const [time, setTime]               = useState(toTimeStr(event.start));
  const [location, setLocation]       = useState(event.location ?? '');
  const [description, setDesc]        = useState(event.description ?? '');
  const [selectedLabel, setLabel]     = useState<EventMeta>(currentMeta);
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
      onConfirm(event.id, payload, activeMeta);
    } catch {
      setError('Error al guardar los cambios.');
      setSaving(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        <h2 style={modalTitle}>Editar evento</h2>

        <label style={lbl}>Título *</label>
        <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} />

        <div style={row}>
          <div style={col}>
            <label style={lbl}>Fecha *</label>
            <input style={inputStyle} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div style={col}>
            <label style={lbl}>Hora (opcional)</label>
            <input style={inputStyle} type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>

        <label style={lbl}>Ubicación</label>
        <input style={inputStyle} value={location} onChange={e => setLocation(e.target.value)} placeholder="Sala A / Meet link..." />

        <label style={lbl}>Descripción</label>
        <textarea
          style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
          value={description}
          onChange={e => setDesc(e.target.value)}
        />

        <label style={lbl}>Etiqueta</label>
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
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label style={lbl}>Color personalizado</label>
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
          <button style={{ ...btnStyles.secondary, opacity: saving ? 0.6 : 1 }} onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            style={{ ...btnStyles.primary, opacity: saving ? 0.6 : 1 }}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
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
const lbl: React.CSSProperties = {
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
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: theme.radius.sm,
  padding: '0.45rem 0.75rem',
  fontSize: '0.9rem',
  marginBottom: '1rem',
  color: theme.colors.textPrimary,
  fontFamily: theme.fonts.body,
};
const row: React.CSSProperties      = { display: 'flex', gap: '0.75rem' };
const col: React.CSSProperties      = { flex: 1 };
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
