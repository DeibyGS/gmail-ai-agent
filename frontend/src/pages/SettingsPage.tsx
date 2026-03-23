import { useEffect, useState } from 'react';
import type { AppConfig } from '../types';
import { fetchConfig, updateConfig } from '../services/api';
import Spinner from '../components/Spinner';
import { theme, btnStyles } from '../theme';

export default function SettingsPage() {
  const [config, setConfig]   = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [loadError, setLoadError]   = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [saveError, setSaveError]   = useState('');

  useEffect(() => {
    fetchConfig()
      .then(setConfig)
      .catch(() => setLoadError('No se pudo cargar la configuración. ¿Está corriendo el backend?'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaveStatus('idle');
    setSaveError('');
    try {
      const updated = await updateConfig(config);
      setConfig(updated);
      setSaveStatus('ok');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setSaveError(msg);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const set = (field: keyof AppConfig, value: string | number) =>
    setConfig(prev => prev ? { ...prev, [field]: value } : prev);

  if (loading) return <div style={styles.page}><Spinner label="Cargando configuración..." /></div>;
  if (loadError) return <div style={styles.page}><p style={styles.error}>{loadError}</p></div>;
  if (!config)   return null;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Configuración</h1>

      {/* ── Sección: Procesamiento ──────────────────────────────────────── */}
      <section style={styles.section}>
        <p style={styles.sectionLabel}>PROCESAMIENTO DE CORREOS</p>

        <div style={styles.field}>
          <label style={styles.label}>Máx. correos por ciclo</label>
          <input
            style={styles.input}
            type="number"
            min={1} max={500}
            value={config.max_emails_per_run}
            onChange={e => set('max_emails_per_run', Number(e.target.value))}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Intervalo del scheduler (minutos)</label>
          <input
            style={styles.input}
            type="number"
            min={1} max={1440}
            value={config.check_interval_minutes}
            onChange={e => set('check_interval_minutes', Number(e.target.value))}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Filtrar correos desde (YYYY/MM/DD)</label>
          <input
            style={styles.input}
            type="text"
            placeholder="2026/03/20"
            value={config.gmail_filter_after_date}
            onChange={e => set('gmail_filter_after_date', e.target.value)}
          />
        </div>
      </section>

      {/* ── Sección: Horario de descanso ────────────────────────────────── */}
      <section style={styles.section}>
        <p style={styles.sectionLabel}>HORARIO DE DESCANSO</p>

        <div style={styles.row}>
          <div style={styles.col}>
            <label style={styles.label}>Hora inicio (0–23)</label>
            <input
              style={styles.input}
              type="number"
              min={0} max={23}
              value={config.quiet_hours_start}
              onChange={e => set('quiet_hours_start', Number(e.target.value))}
            />
          </div>
          <div style={styles.col}>
            <label style={styles.label}>Hora fin (1–24)</label>
            <input
              style={styles.input}
              type="number"
              min={1} max={24}
              value={config.quiet_hours_end}
              onChange={e => set('quiet_hours_end', Number(e.target.value))}
            />
          </div>
        </div>
        <p style={styles.hint}>
          ℹ️ El ciclo automático no procesará correos entre las {config.quiet_hours_start}:00 y las {config.quiet_hours_end}:00.
        </p>
      </section>

      {/* ── Feedback + botón ────────────────────────────────────────────── */}
      {saveStatus === 'ok' && (
        <p style={styles.success}>✅ Configuración guardada correctamente.</p>
      )}
      {saveStatus === 'error' && (
        <p style={styles.error}>❌ {saveError || 'Error al guardar.'}</p>
      )}

      <div style={styles.actions}>
        <button
          className="btn-primary"
          style={{ ...btnStyles.primary, opacity: saving ? 0.6 : 1 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page:         { padding: '1.5rem', maxWidth: '640px', margin: '0 auto' },
  title:        { margin: '0 0 1.5rem', fontFamily: theme.fonts.heading, fontSize: '1.25rem', fontWeight: 700, color: theme.colors.textPrimary },
  section: {
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    padding: '1.25rem 1.5rem',
    marginBottom: '1.25rem',
    boxShadow: theme.shadows.card,
  },
  sectionLabel: {
    margin: '0 0 1rem',
    fontFamily: theme.fonts.mono,
    fontSize: '0.72rem',
    fontWeight: 700,
    color: theme.colors.textMuted,
    letterSpacing: '0.08em',
  },
  field:   { marginBottom: '1rem' },
  label:   { display: 'block', fontFamily: theme.fonts.body, fontSize: '0.82rem', color: theme.colors.textSecondary, fontWeight: 600, marginBottom: '0.3rem' },
  input: {
    width: '100%',
    boxSizing: 'border-box' as const,
    background: theme.colors.bg,
    border: `1px solid rgba(255,255,255,0.12)`,
    borderRadius: theme.radius.sm,
    padding: '0.45rem 0.75rem',
    fontSize: '0.9rem',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.body,
  },
  row:     { display: 'flex', gap: '1rem' },
  col:     { flex: 1, marginBottom: '0.75rem' },
  hint:    { margin: '0.25rem 0 0', fontFamily: theme.fonts.body, fontSize: '0.8rem', color: theme.colors.textMuted },
  actions: { display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' },
  success: { fontFamily: theme.fonts.body, fontSize: '0.875rem', color: '#34D399', marginBottom: '0.75rem' },
  error:   { fontFamily: theme.fonts.body, fontSize: '0.875rem', color: theme.colors.danger, marginBottom: '0.75rem' },
};
