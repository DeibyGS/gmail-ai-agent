import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Email, ProcessedEmail, EmailCategory, CreateEventPayload, EventMeta } from '../types';
import { fetchEmails, fetchProcessedEmails, triggerProcess, createCalendarEvent, searchEmails } from '../services/api';
import EmailCard from '../components/EmailCard';
import EventCreateModal from '../components/EventCreateModal';
import Spinner from '../components/Spinner';
import { theme, btnStyles } from '../theme';

type Tab = 'pending' | 'today' | 'history';

const CATEGORIES: EmailCategory[] = [
  'reunion', 'urgente', 'recordatorio', 'factura',
  'soporte', 'notificacion', 'personal', 'promocion', 'informativo', 'otro',
];

export default function EmailsPage() {
  const [activeTab, setActiveTab]           = useState<Tab>('pending');
  const [pending, setPending]               = useState<Email[]>([]);
  const [processedToday, setProcessedToday] = useState<ProcessedEmail[]>([]);
  const [history, setHistory]               = useState<ProcessedEmail[]>([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSince, setFilterSince]       = useState('');
  const [filterSearch, setFilterSearch]     = useState('');
  const [loading, setLoading]               = useState(false);
  const [processing, setProcessing]         = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [schedulingEmail, setSchedulingEmail]   = useState<Email | null>(null);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, EmailCategory>>({});
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const effectiveCategory = (email: Email): EmailCategory =>
    categoryOverrides[email.id] ?? email.category;

  // Carga pendientes o procesados hoy
  const loadTab = useCallback(async (tab: Exclude<Tab, 'history'>) => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'pending') {
        const data = await fetchEmails();
        setPending(data);
      } else {
        const data = await fetchProcessedEmails('today');
        setProcessedToday(data);
      }
    } catch {
      setError('No se pudo conectar con el backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga el historial con los filtros actuales (fecha, categoría y búsqueda FTS5)
  const loadHistory = useCallback(async (since: string, category: string, search: string) => {
    setLoading(true);
    setError(null);
    try {
      let data: ProcessedEmail[];
      if (search.trim()) {
        // Cuando hay texto de búsqueda, usa FTS5 en el backend
        data = await searchEmails(
          search.trim(),
          category || undefined,
          since || undefined,
        );
      } else {
        data = await fetchProcessedEmails(
          'history',
          since || undefined,
          category || undefined,
        );
      }
      setHistory(data);
    } catch {
      setError('No se pudo conectar con el backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial al cambiar de pestaña
  useEffect(() => {
    if (activeTab === 'pending') loadTab('pending');
    else if (activeTab === 'today') loadTab('today');
    else loadHistory(filterSince, filterCategory, filterSearch);
  }, [activeTab]);    // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-filter historial con debounce 300ms al cambiar filtros
  useEffect(() => {
    if (activeTab !== 'history') return;
    const timer = setTimeout(() => loadHistory(filterSince, filterCategory, filterSearch), 300);
    return () => clearTimeout(timer);
  }, [filterSince, filterCategory, filterSearch, activeTab, loadHistory]);

  const handleProcess = async () => {
    setProcessing(true);
    setError(null);
    try {
      await triggerProcess();
      const [newPending, newToday] = await Promise.all([
        fetchEmails(),
        fetchProcessedEmails('today'),
      ]);
      setPending(newPending);
      setProcessedToday(newToday);
      if (activeTab !== 'today') setActiveTab('today');
    } catch {
      setError('Error al procesar correos.');
    } finally {
      setProcessing(false);
    }
  };

  const hasHistoryFilters = filterSince !== '' || filterCategory !== '' || filterSearch !== '';

  const handleScheduleConfirm = async (payload: CreateEventPayload, _meta: EventMeta) => {
    try {
      await createCalendarEvent(payload);
      toast.success('Evento creado en Google Calendar ✓');
    } catch {
      toast.error('Error al crear el evento en Calendar.');
    } finally {
      setSchedulingEmail(null);
    }
  };

  return (
    <div style={styles.page}>

      {/* ── Modal de agendado manual ─────────────────────────── */}
      {schedulingEmail && (
        <EventCreateModal
          initialDate={schedulingEmail.event_data?.date ?? ''}
          initialData={{
            title:       schedulingEmail.event_data?.title    ?? schedulingEmail.subject,
            time:        schedulingEmail.event_data?.time     ?? '',
            location:    schedulingEmail.event_data?.location ?? '',
            description: schedulingEmail.event_data?.description ?? '',
          }}
          onConfirm={handleScheduleConfirm}
          onClose={() => setSchedulingEmail(null)}
        />
      )}

      {/* ── Header ──────────────────────────────────────────── */}
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

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div style={styles.tabs}>
        {([
          { key: 'pending', label: `Pendientes${pending.length > 0 ? ` (${pending.length})` : ''}` },
          { key: 'today',   label: `Procesados hoy${processedToday.length > 0 ? ` (${processedToday.length})` : ''}` },
          { key: 'history', label: 'Historial' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            style={{ ...styles.tab, ...(activeTab === key ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {/* ── Tab: Pendientes ─────────────────────────────────── */}
      {activeTab === 'pending' && (
        <>
          {loading && <Spinner label="Cargando correos pendientes..." />}
          {!loading && pending.length === 0 && <EmptyInboxCard />}
          <div style={styles.list}>
            {pending.map(email => {
              const category = effectiveCategory(email);
              const isEditing = editingCategoryId === email.id;
              return (
                <div key={email.id}>
                  <EmailCard email={{ ...email, category }} />
                  <div style={styles.cardActions}>
                    {/* ── Cambiar tipo ──────────────────────────── */}
                    {isEditing ? (
                      <select
                        autoFocus
                        value={category}
                        style={styles.categorySelect}
                        onChange={e => {
                          setCategoryOverrides(prev => ({ ...prev, [email.id]: e.target.value }));
                          setEditingCategoryId(null);
                        }}
                        onBlur={() => setEditingCategoryId(null)}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <button
                        style={styles.editCategoryBtn}
                        onClick={() => setEditingCategoryId(email.id)}
                        title="Cambiar clasificación"
                      >
                        ✏️ Cambiar tipo
                      </button>
                    )}
                    {/* ── Agendar (solo si es reunion) ──────────── */}
                    {category === 'reunion' && !isEditing && (
                      <button
                        className="btn-primary"
                        style={{ ...btnStyles.primary, fontSize: '0.8rem', padding: '0.3rem 0.9rem' }}
                        onClick={() => setSchedulingEmail({ ...email, category })}
                      >
                        📅 Agendar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Tab: Procesados hoy ─────────────────────────────── */}
      {activeTab === 'today' && (
        <>
          {loading && <Spinner label="Cargando correos de hoy..." />}
          {!loading && processedToday.length === 0 && (
            <p style={styles.info}>Aún no has procesado correos hoy. Pulsa "Procesar ahora".</p>
          )}
          <div style={styles.list}>
            {processedToday.map(email => <ProcessedEmailCard key={email.id} email={email} />)}
          </div>
        </>
      )}

      {/* ── Tab: Historial ──────────────────────────────────── */}
      {activeTab === 'history' && (
        <>
          {/* Filtros — auto-disparo, sin botón */}
          <div style={styles.filters}>
            {/* Campo de búsqueda FTS5 */}
            <input
              type="search"
              placeholder="Buscar en asunto, remitente o resumen..."
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              style={{ ...styles.filterInput, minWidth: '240px' }}
              title="Búsqueda full-text: busca en asunto, remitente y resumen simultáneamente"
            />
            <input
              type="date"
              value={filterSince}
              onChange={e => setFilterSince(e.target.value)}
              style={styles.filterInput}
              title="Filtrar desde fecha"
            />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              style={styles.filterInput}
            >
              <option value="">Todas las categorías</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {/* Limpiar filtros */}
            {hasHistoryFilters && (
              <button
                className="btn-secondary"
                style={{ ...btnStyles.secondary, fontSize: '0.8rem', padding: '0.35rem 0.8rem' }}
                onClick={() => { setFilterSince(''); setFilterCategory(''); setFilterSearch(''); }}
              >
                Limpiar
              </button>
            )}
          </div>

          {loading && <Spinner label="Buscando en el historial..." />}

          {!loading && history.length === 0 && (
            hasHistoryFilters
              ? <EmptyHistoryCard variant="no-results" />
              : <EmptyHistoryCard variant="empty" />
          )}

          <div style={styles.list}>
            {history.map(email => (
              <ProcessedEmailCard key={email.id} email={email} showDate highlight={filterSearch} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Empty states ──────────────────────────────────────────────────────────────

function EmptyInboxCard() {
  return (
    <div style={emptyStyles.wrap}>
      <div style={emptyStyles.icon}>📬</div>
      <h2 style={emptyStyles.title}>¡Todo al día!</h2>
      <p style={emptyStyles.subtitle}>
        Tu bandeja está completamente vacía.<br />
        No hay correos pendientes por procesar.
      </p>
      <div style={{ ...emptyStyles.pill, color: '#34D399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.25)' }}>
        ✨ Sin correos pendientes
      </div>
    </div>
  );
}

function EmptyHistoryCard({ variant }: { variant: 'empty' | 'no-results' }) {
  const isEmpty = variant === 'empty';
  return (
    <div style={emptyStyles.wrap}>
      <div style={emptyStyles.icon}>{isEmpty ? '📂' : '🔍'}</div>
      <h2 style={emptyStyles.title}>
        {isEmpty ? 'Aún no hay historial' : 'Sin resultados'}
      </h2>
      <p style={emptyStyles.subtitle}>
        {isEmpty
          ? <>Procesa algunos correos para que<br />aparezcan aquí con toda su información.</>
          : <>No encontramos correos con los filtros aplicados.<br />Prueba con otras fechas o categorías.</>
        }
      </p>
      <div style={{ ...emptyStyles.pill, color: '#818CF8', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)' }}>
        {isEmpty ? '💡 Pulsa "Procesar ahora" para empezar' : '↩ Ajusta los filtros'}
      </div>
    </div>
  );
}

const emptyStyles: Record<string, React.CSSProperties> = {
  wrap: {
    marginTop: '2rem',
    padding: '2.5rem 2rem',
    background: 'rgba(17,24,39,0.7)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: '16px',
    boxShadow: '0 0 40px rgba(99,102,241,0.08), 0 4px 24px rgba(0,0,0,0.4)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    textAlign: 'center',
  },
  icon: { fontSize: '3.5rem', lineHeight: 1, marginBottom: '0.25rem' },
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

/** Resalta las ocurrencias de `term` dentro de `text` con un span amarillo. */
function Highlight({ text, term }: { text: string; term: string }) {
  if (!term.trim()) return <>{text}</>;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase()
          ? <mark key={i} style={hlStyle}>{part}</mark>
          : part
      )}
    </>
  );
}

const hlStyle: React.CSSProperties = {
  background: 'rgba(251,191,36,0.35)',
  color: '#FCD34D',
  borderRadius: '2px',
  padding: '0 2px',
};

function ProcessedEmailCard({
  email,
  showDate = false,
  highlight = '',
}: {
  email: ProcessedEmail;
  showDate?: boolean;
  highlight?: string;
}) {
  const colors = colorFor(email.category);
  const time = new Date(email.processed_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const date = new Date(email.processed_at).toLocaleDateString('es-ES');

  return (
    <div style={cardStyles.card}>
      <div style={cardStyles.header}>
        <span style={{ ...cardStyles.badge, background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
          {email.category}
        </span>
        <span style={cardStyles.time}>{showDate ? `${date} ${time}` : time}</span>
      </div>
      <p style={cardStyles.subject}><Highlight text={email.subject} term={highlight} /></p>
      <p style={cardStyles.sender}>De: <Highlight text={email.sender} term={highlight} /></p>
      {email.summary && (
        <p style={cardStyles.summary}><Highlight text={email.summary} term={highlight} /></p>
      )}
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
  filters: { display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' },
  filterInput: {
    background: theme.colors.surface,
    border: `1px solid rgba(255,255,255,0.12)`,
    borderRadius: theme.radius.sm,
    padding: '0.4rem 0.75rem',
    fontSize: '0.875rem',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.body,
  },
  list:        { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  cardActions: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' },
  editCategoryBtn: {
    background: 'none',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    color: theme.colors.textMuted,
    fontFamily: theme.fonts.body,
    fontSize: '0.78rem',
    padding: '0.25rem 0.65rem',
    cursor: 'pointer',
  },
  categorySelect: {
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.gradientStart}`,
    borderRadius: theme.radius.sm,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.body,
    fontSize: '0.82rem',
    padding: '0.25rem 0.5rem',
    cursor: 'pointer',
  },
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
  badge:   { fontFamily: theme.fonts.mono, fontSize: '0.72rem', fontWeight: 500, padding: '2px 10px', borderRadius: theme.radius.pill },
  time:    { fontFamily: theme.fonts.mono, fontSize: '0.78rem', color: theme.colors.textMuted },
  subject: { margin: 0, fontFamily: theme.fonts.heading, fontSize: '0.95rem', fontWeight: 600, color: theme.colors.textPrimary },
  sender:  { margin: 0, fontFamily: theme.fonts.body, fontSize: '0.82rem', color: theme.colors.textSecondary },
  summary: { margin: 0, fontFamily: theme.fonts.body, fontSize: '0.875rem', color: theme.colors.textSecondary, lineHeight: 1.6 },
};
