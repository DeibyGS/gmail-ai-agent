import { useState } from 'react';
import type { CreateEventPayload, EventMeta } from '../types';

// Etiquetas predefinidas con sus colores
export const LABEL_OPTIONS: EventMeta[] = [
  { label: 'reunion',   color: '#4f46e5' },
  { label: 'trabajo',   color: '#0ea5e9' },
  { label: 'personal',  color: '#10b981' },
  { label: 'urgente',   color: '#ef4444' },
  { label: 'otro',      color: '#6b7280' },
];

interface Props {
  initialDate?: string;  // YYYY-MM-DD
  onConfirm: (payload: CreateEventPayload, meta: EventMeta) => void;
  onClose: () => void;
}

export default function EventCreateModal({ initialDate = '', onConfirm, onClose }: Props) {
  const [title, setTitle]           = useState('');
  const [date, setDate]             = useState(initialDate);
  const [time, setTime]             = useState('');
  const [location, setLocation]     = useState('');
  const [description, setDesc]      = useState('');
  const [selectedLabel, setLabel]   = useState<EventMeta>(LABEL_OPTIONS[0]);
  const [customColor, setCustomColor] = useState('');
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

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

        <label style={label_}>Título *</label>
        <input style={input} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Reunión con equipo" />

        <div style={row}>
          <div style={col}>
            <label style={label_}>Fecha *</label>
            <input style={input} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div style={col}>
            <label style={label_}>Hora (opcional)</label>
            <input style={input} type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>

        <label style={label_}>Ubicación</label>
        <input style={input} value={location} onChange={e => setLocation(e.target.value)} placeholder="Sala A / Meet link..." />

        <label style={label_}>Descripción</label>
        <textarea style={{ ...input, minHeight: '60px', resize: 'vertical' }} value={description} onChange={e => setDesc(e.target.value)} />

        <label style={label_}>Etiqueta</label>
        <div style={labelRow}>
          {LABEL_OPTIONS.map(opt => (
            <button
              key={opt.label}
              onClick={() => { setLabel(opt); setCustomColor(''); }}
              style={{
                ...labelBtn,
                background: opt.color,
                outline: selectedLabel.label === opt.label && !customColor ? '2px solid #000' : 'none',
              }}
              title={opt.label}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label style={label_}>Color personalizado</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <input type="color" value={customColor || selectedLabel.color} onChange={e => setCustomColor(e.target.value)} style={{ width: '40px', height: '32px', border: 'none', cursor: 'pointer' }} />
          {customColor && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Color libre activo</span>}
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>{error}</p>}

        <div style={actions}>
          <button style={btnCancel} onClick={onClose}>Cancelar</button>
          <button style={{ ...btnSave, opacity: saving ? 0.6 : 1 }} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Guardando...' : 'Crear evento'}
          </button>
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
  background: '#fff', borderRadius: '10px', padding: '1.5rem',
  width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
};
const modalTitle: React.CSSProperties = { margin: '0 0 1.25rem', fontSize: '1.1rem', fontWeight: 700 };
const label_: React.CSSProperties = { display: 'block', fontSize: '0.82rem', color: '#374151', fontWeight: 600, marginBottom: '0.3rem' };
const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid #d1d5db', borderRadius: '6px',
  padding: '0.45rem 0.75rem', fontSize: '0.9rem', marginBottom: '1rem',
};
const row: React.CSSProperties = { display: 'flex', gap: '0.75rem' };
const col: React.CSSProperties = { flex: 1 };
const labelRow: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' };
const labelBtn: React.CSSProperties = {
  color: '#fff', border: 'none', borderRadius: '999px',
  padding: '3px 12px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600,
};
const actions: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' };
const btnCancel: React.CSSProperties = { background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.45rem 1rem', cursor: 'pointer', fontSize: '0.875rem' };
const btnSave: React.CSSProperties = { background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.45rem 1.1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' };
