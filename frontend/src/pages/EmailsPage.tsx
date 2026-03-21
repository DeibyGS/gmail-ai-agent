import { useEffect, useState } from 'react';
import type { Email, ProcessedEmail, EmailCategory } from '../types';
import { fetchEmails, fetchProcessedEmails, triggerProcess } from '../services/api';
import EmailCard from '../components/EmailCard';
import { theme, btnStyles } from '../theme';

type Tab = 'pending' | 'today' | 'history';

// Categorías disponibles para el filtro del historial
const CATEGORIES: EmailCategory[] = ['reunion', 'urgente', 'informativo', 'promocion', 'otro'];

export default function EmailsPage() {
  const [activeTab, setActiveTab]           = useState<Tab>('pending');
  const [pending, setPending]               = useState<Email[]>([]);
  const [processedToday, setProcessedToday] = useState<ProcessedEmail[]>([]);
  const [history, setHistory]               = useState<ProcessedEmail[]>([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSince, setFilterSince]       = useState('');
  const [loading, setLoading]               = useState(false);
  const [processing, setProcessing]         = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  // Carga los datos según la pestaña activa
  const loadTab = async (tab: Tab) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'pending') {
        const data = await fetchEmails();
        setPending(data);
      } else if (tab === 'today') {
        const data = await fetchProcessedEmails('today');
        setProcessedToday(data);
      } else {
        const data = await fetchProcessedEmails('history', filterSince || undefined, filterCategory || undefined);
        setHistory(data);
      }
    } catch {
      setError('No se pudo conectar con el backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTab(activeTab); }, [activeTab]);

  const handleTabChange = (tab: Tab) => { setActiveTab(tab); };

  const handleProcess = async () => {
    setProcessing(true);
    setError(null);
    try {
      await triggerProcess();
      // Después de procesar, recargamos pendientes y hoy
      const [newPending, newToday] = await Promise.all([
        fetchEmails(),
        fetchProcessedEmails('today'),
      ]);
      setPending(newPending);
      setProcessedToday(newToday);
      // Si estamos en otra pestaña, volvemos a hoy para ver el resultado
      if (activeTab !== 'today') setActiveTab('today');
    } catch {
      setError('Error al procesar correos.');
    } finally {
      setProcessing(false);
    }
  };

  const handleHistoryFilter = () => loadTab('history');

  return (
    <div style={styles.page}>

      {/* ── Header ────────────────────────────────────────────────── */}
      <div style={styles.header}>
        <h1 style={styles.title}>Correos</h1>
        <button
          className={`btn-primary${processing ? ' ai-processing' : ''}`}
          style={{ ...btnStyles.primary, opacity: processing ? 0.7 : 1 }}
          onClick={handleProcess}
          disabled={processing}
        >
          {processing ? 'Procesando...' : 'Procesar ahora'}
        </button>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────── */}
      <div style={styles.tabs}>
        {([
          { key: 'pending', label: `Pendientes${pending.length > 0 ? ` (${pending.length})` : ''}` },
          { key: 'today',   label: `Procesados hoy${processedToday.length > 0 ? ` (${processedToday.length})` : ''}` },
          { key: 'history', label: 'Historial' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            style={{ ...styles.tab, ...(activeTab === key ? styles.tabActive : {}) }}
            onClick={() => handleTabChange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {/* ── Tab: Pendientes ───────────────────────────────────────── */}
      {activeTab === 'pending' && (
        <>
          {loading && <p style={styles.info}>Cargando correos pendientes...</p>}
          {!loading && pending.length === 0 && <EmptyInboxCard />}
          <div style={styles.list}>
            {pending.map(email => <EmailCard key={email.id} email={email} />)}
          </div>
        </>
      )}

      {/* ── Tab: Procesados hoy ───────────────────────────────────── */}
      {activeTab === 'today' && (
        <>
          {loading && <p style={styles.info}>Cargando correos de hoy...</p>}
          {!loading && processedToday.length === 0 && (
            <p style={styles.info}>Aún no has procesado correos hoy. Pulsa "Procesar ahora".</p>
          )}
          <div style={styles.list}>
            {processedToday.map(email => (
              <ProcessedEmailCard key={email.id} email={email} />
            ))}
          </div>
        </>
      )}

      {/* ── Tab: Historial ───────────────────────────────────────── */}
      {activeTab === 'history' && (
        <>
          {/* Filtros */}
          <div style={styles.filters}>
            <input
              type="date"
              value={filterSince}
              onChange={e => setFilterSince(e.target.value)}
              style={styles.filterInput}
            />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              style={styles.filterInput}
            >
              <option value="">Todas las categorías</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn-secondary" style={btnStyles.secondary} onClick={handleHistoryFilter}>
              Filtrar
            </button>
          </div>

          {loading && <p style={styles.info}>Cargando historial...</p>}
          {!loading && history.length === 0 && (
            <p style={styles.info}>No hay correos en el historial con estos filtros.</p>
          )}
          <div style={styles.list}>
            {history.map(email => (
              <ProcessedEmailCard key={email.id} email={email} showDate />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Componente interno: empty state bandeja vacía ────────────────────────────

function EmptyInboxCard() {
  return (
    <div style={emptyCard.wrap}>
      <div style={emptyCard.icon}>📬</div>
      <h2 style={emptyCard.title}>¡Todo al día!</h2>
      <p style={emptyCard.subtitle}>
        Tu bandeja está completamente vacía.<br />
        No hay correos pendientes por procesar.
      </p>
      <div style={emptyCard.pill}>✨ Sin correos pendientes</div>
    </div>
  );
}

const emptyCard: Record<string, React.CSSProperties> = {
  wrap: {
    marginTop: '2rem',
    padding: '2.5rem 2rem',
    background: 'rgba(17, 24, 39, 0.7)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
    borderRadius: '16px',
    boxShadow: '0 0 40px rgba(99, 102, 241, 0.08), 0 4px 24px rgba(0,0,0,0.4)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    textAlign: 'center',
  },
  icon: {
    fontSize: '3.5rem',
    lineHeight: 1,
    marginBottom: '0.25rem',
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
    margin: 0,
    fontFamily: theme.fonts.body,
    fontSize: '0.9rem',
    color: theme.colors.textSecondary,
    lineHeight: 1.6,
  },
  pill: {
    marginTop: '0.5rem',
    fontFamily: theme.fonts.mono,
    fontSize: '0.75rem',
    color: '#34D399',
    background: 'rgba(52, 211, 153, 0.1)',
    border: '1px solid rgba(52, 211, 153, 0.25)',
    borderRadius: theme.radius.pill,
    padding: '4px 14px',
  },
};

// ── Componente interno: tarjeta de correo procesado ──────────────────────────

const fallbackPalette = [
  { bg: 'rgba(99,102,241,0.15)',  text: '#818CF8',  border: 'rgba(99,102,241,0.3)' },
  { bg: 'rgba(34,211,238,0.15)',  text: '#22D3EE',  border: 'rgba(34,211,238,0.3)' },
  { bg: 'rgba(167,139,250,0.15)', text: '#A78BFA',  border: 'rgba(167,139,250,0.3)' },
  { bg: 'rgba(251,146,60,0.15)',  text: '#FB923C',  border: 'rgba(251,146,60,0.3)' },
  { bg: 'rgba(52,211,153,0.15)',  text: '#34D399',  border: 'rgba(52,211,153,0.3)' },
];
const colorCache: Record<string, { bg: string; text: string; border: string }> = {};
let paletteIdx = 0;

function colorFor(cat: string) {
  if (theme.colors.categoryColors[cat]) return theme.colors.categoryColors[cat];
  if (!colorCache[cat]) {
    colorCache[cat] = fallbackPalette[paletteIdx % fallbackPalette.length];
    paletteIdx++;
  }
  return colorCache[cat];
}

function ProcessedEmailCard({ email, showDate = false }: { email: ProcessedEmail; showDate?: boolean }) {
  const colors = colorFor(email.category);
  const time = new Date(email.processed_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const date = new Date(email.processed_at).toLocaleDateString('es-ES');

  return (
    <div style={cardStyles.card}>
      <div style={cardStyles.header}>
        <span style={{
          ...cardStyles.badge,
          background: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.border}`,
        }}>
          {email.category}
        </span>
        <span style={cardStyles.time}>{showDate ? `${date} ${time}` : time}</span>
      </div>
      <p style={cardStyles.subject}>{email.subject}</p>
      <p style={cardStyles.sender}>De: {email.sender}</p>
      {email.summary && <p style={cardStyles.summary}>{email.summary}</p>}
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page:    { padding: '1.5rem', maxWidth: '760px', margin: '0 auto' },
  header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  title:   { margin: 0, fontFamily: theme.fonts.heading, fontSize: '1.25rem', fontWeight: 700, color: theme.colors.textPrimary },
  tabs: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.25rem',
    borderBottom: `1px solid ${theme.colors.border}`,
    paddingBottom: '0',
  },
  tab: {
    background: 'none',
    border: 'none',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    fontFamily: theme.fonts.body,
    fontSize: '0.875rem',
    color: theme.colors.textMuted,
    borderBottom: '2px solid transparent',
    marginBottom: '-1px',
    transition: 'color 0.15s ease',
  },
  tabActive: {
    color: '#818CF8',
    fontWeight: 700,
    borderBottom: `2px solid ${theme.colors.gradientStart}`,
  },
  filters: { display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' },
  filterInput: {
    background: theme.colors.surface,
    border: `1px solid rgba(255,255,255,0.12)`,
    borderRadius: theme.radius.sm,
    padding: '0.4rem 0.75rem',
    fontSize: '0.875rem',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.body,
  },
  list:  { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  info:  { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: '0.9rem' },
  error: { color: theme.colors.danger,   fontFamily: theme.fonts.body, fontSize: '0.9rem' },
};

const cardStyles: Record<string, React.CSSProperties> = {
  card: {
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    padding: '1rem 1.25rem',
    boxShadow: theme.shadows.card,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  header:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    fontFamily: theme.fonts.mono,
    fontSize: '0.72rem',
    fontWeight: 500,
    padding: '2px 10px',
    borderRadius: theme.radius.pill,
  },
  time:    { fontFamily: theme.fonts.mono, fontSize: '0.78rem', color: theme.colors.textMuted },
  subject: { margin: 0, fontFamily: theme.fonts.heading, fontSize: '0.95rem', fontWeight: 600, color: theme.colors.textPrimary },
  sender:  { margin: 0, fontFamily: theme.fonts.body, fontSize: '0.82rem', color: theme.colors.textSecondary },
  summary: { margin: 0, fontFamily: theme.fonts.body, fontSize: '0.875rem', color: theme.colors.textSecondary, lineHeight: 1.6 },
};
