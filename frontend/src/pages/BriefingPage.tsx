import { useEffect, useState } from 'react';
import type { BriefingData } from '../types';
import { fetchBriefing } from '../services/api';
import Spinner from '../components/Spinner';
import { theme, btnStyles } from '../theme';

export default function BriefingPage() {
  const [briefing, setBriefing]  = useState<BriefingData | null>(null);
  const [loading, setLoading]    = useState(true);
  const [error, setError]        = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');

  const load = async (date?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBriefing(date || undefined);
      setBriefing(data);
    } catch {
      setError('No se pudo generar el briefing. Comprueba que el backend está activo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={styles.page}>
      {/* ── Header ──────────────────────────────────────────── */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Briefing diario</h1>
          <p style={styles.subtitle}>Resumen ejecutivo generado por IA</p>
        </div>
        <div style={styles.headerActions}>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={styles.dateInput}
            title="Ver briefing de otra fecha"
          />
          <button
            className="btn-primary"
            style={{ ...btnStyles.primary, fontSize: '0.85rem' }}
            onClick={() => load(selectedDate || undefined)}
            disabled={loading}
          >
            {loading ? 'Generando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}
      {loading && <Spinner label="Consultando tus correos con Gemini..." />}

      {!loading && briefing && (
        <div style={styles.grid}>

          {/* ── Resumen general ───────────────────────────────── */}
          <div style={{ ...styles.card, ...styles.cardWide }}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>🧠</span>
              <h2 style={styles.cardTitle}>Resumen del día</h2>
              <span style={styles.cardBadge}>{briefing.date}</span>
            </div>
            <p style={styles.summaryText}>{briefing.summary}</p>
            {/* Mini estadísticas */}
            <div style={styles.statsRow}>
              <StatPill label="Total procesados" value={briefing.total} color="#818CF8" />
              {Object.entries(briefing.by_category)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([cat, count]) => (
                  <StatPill key={cat} label={cat} value={count} color={categoryColor(cat)} />
                ))
              }
            </div>
          </div>

          {/* ── Urgentes ──────────────────────────────────────── */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>🚨</span>
              <h2 style={styles.cardTitle}>Requieren acción</h2>
              <span style={{ ...styles.cardBadge, background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                {briefing.urgent_emails.length}
              </span>
            </div>
            {briefing.urgent_emails.length === 0 ? (
              <EmptyState icon="✅" text="Sin urgentes hoy. ¡Buen trabajo!" />
            ) : (
              <div style={styles.itemList}>
                {briefing.urgent_emails.map((u, i) => (
                  <div key={i} style={styles.urgentItem}>
                    <p style={styles.itemSubject}>{u.subject}</p>
                    <p style={styles.itemSender}>De: {u.sender}</p>
                    <p style={styles.itemAction}>→ {u.action}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Reuniones pendientes ──────────────────────────── */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardIcon}>📅</span>
              <h2 style={styles.cardTitle}>Reuniones pendientes</h2>
              <span style={{ ...styles.cardBadge, background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }}>
                {briefing.pending_meetings.length}
              </span>
            </div>
            {briefing.pending_meetings.length === 0 ? (
              <EmptyState icon="🎉" text="Sin reuniones pendientes de agendar." />
            ) : (
              <div style={styles.itemList}>
                {briefing.pending_meetings.map((m, i) => (
                  <div key={i} style={styles.meetingItem}>
                    <p style={styles.itemSubject}>{m.subject}</p>
                    <p style={styles.itemSender}>De: {m.sender}</p>
                    {m.note && <p style={styles.itemNote}>{m.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Recomendaciones ───────────────────────────────── */}
          {briefing.recommendations.length > 0 && (
            <div style={{ ...styles.card, ...styles.cardWide }}>
              <div style={styles.cardHeader}>
                <span style={styles.cardIcon}>💡</span>
                <h2 style={styles.cardTitle}>Recomendaciones del agente</h2>
              </div>
              <ul style={styles.recList}>
                {briefing.recommendations.map((r, i) => (
                  <li key={i} style={styles.recItem}>{r}</li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ ...styles.pill, borderColor: `${color}44`, background: `${color}18` }}>
      <span style={{ color, fontWeight: 700, fontSize: '1.1rem' }}>{value}</span>
      <span style={{ color: theme.colors.textMuted, fontSize: '0.7rem' }}>{label}</span>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={styles.emptyState}>
      <span style={{ fontSize: '1.5rem' }}>{icon}</span>
      <span style={{ color: theme.colors.textMuted, fontSize: '0.875rem' }}>{text}</span>
    </div>
  );
}

function categoryColor(cat: string): string {
  const map: Record<string, string> = {
    urgente: '#F87171', reunion: '#818CF8', recordatorio: '#FB923C',
    factura: '#34D399', soporte: '#22D3EE', notificacion: '#A78BFA',
    personal: '#F472B6', promocion: '#FBBF24', otro: '#9CA3AF',
  };
  return map[cat] ?? '#9CA3AF';
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '1.5rem',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  title: {
    margin: 0,
    fontFamily: theme.fonts.heading,
    fontSize: '1.4rem',
    fontWeight: 700,
    background: theme.gradients.primary,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    margin: '0.2rem 0 0',
    fontFamily: theme.fonts.body,
    fontSize: '0.85rem',
    color: theme.colors.textMuted,
  },
  dateInput: {
    background: theme.colors.surface,
    border: `1px solid rgba(255,255,255,0.12)`,
    borderRadius: theme.radius.sm,
    padding: '0.4rem 0.75rem',
    fontSize: '0.875rem',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.body,
  },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.fonts.body,
    fontSize: '0.9rem',
    marginBottom: '1rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  card: {
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    padding: '1.25rem',
    boxShadow: theme.shadows.card,
  },
  cardWide: {
    gridColumn: '1 / -1',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    marginBottom: '0.85rem',
  },
  cardIcon: {
    fontSize: '1.2rem',
    lineHeight: 1,
  },
  cardTitle: {
    margin: 0,
    fontFamily: theme.fonts.heading,
    fontSize: '0.95rem',
    fontWeight: 700,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  cardBadge: {
    fontFamily: theme.fonts.mono,
    fontSize: '0.75rem',
    padding: '2px 10px',
    borderRadius: theme.radius.pill,
    background: 'rgba(129,140,248,0.15)',
    color: '#818CF8',
    border: '1px solid rgba(129,140,248,0.3)',
  },
  summaryText: {
    margin: 0,
    fontFamily: theme.fonts.body,
    fontSize: '0.9rem',
    color: theme.colors.textSecondary,
    lineHeight: 1.65,
    marginBottom: '1rem',
  },
  statsRow: {
    display: 'flex',
    gap: '0.6rem',
    flexWrap: 'wrap',
  },
  pill: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '6px 14px',
    borderRadius: theme.radius.md,
    border: '1px solid transparent',
    gap: '2px',
    minWidth: '60px',
  },
  itemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  urgentItem: {
    borderLeft: '3px solid rgba(248,113,113,0.6)',
    paddingLeft: '0.75rem',
  },
  meetingItem: {
    borderLeft: '3px solid rgba(129,140,248,0.6)',
    paddingLeft: '0.75rem',
  },
  itemSubject: {
    margin: 0,
    fontFamily: theme.fonts.body,
    fontSize: '0.875rem',
    fontWeight: 600,
    color: theme.colors.textPrimary,
  },
  itemSender: {
    margin: '2px 0 0',
    fontFamily: theme.fonts.body,
    fontSize: '0.78rem',
    color: theme.colors.textMuted,
  },
  itemAction: {
    margin: '4px 0 0',
    fontFamily: theme.fonts.mono,
    fontSize: '0.78rem',
    color: '#F87171',
  },
  itemNote: {
    margin: '4px 0 0',
    fontFamily: theme.fonts.mono,
    fontSize: '0.78rem',
    color: '#A78BFA',
  },
  recList: {
    margin: 0,
    paddingLeft: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  recItem: {
    fontFamily: theme.fonts.body,
    fontSize: '0.875rem',
    color: theme.colors.textSecondary,
    lineHeight: 1.5,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem 0',
    textAlign: 'center',
  },
};
