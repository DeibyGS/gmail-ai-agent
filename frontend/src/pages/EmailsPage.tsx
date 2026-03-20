import { useEffect, useState } from 'react';
import type { Email, ProcessedEmail, EmailCategory } from '../types';
import { fetchEmails, fetchProcessedEmails, triggerProcess } from '../services/api';
import EmailCard from '../components/EmailCard';

type Tab = 'pending' | 'today' | 'history';

// Categorías disponibles para el filtro del historial
const CATEGORIES: EmailCategory[] = ['reunion', 'urgente', 'informativo', 'promocion', 'otro'];

export default function EmailsPage() {
  const [activeTab, setActiveTab]         = useState<Tab>('pending');
  const [pending, setPending]             = useState<Email[]>([]);
  const [processedToday, setProcessedToday] = useState<ProcessedEmail[]>([]);
  const [history, setHistory]             = useState<ProcessedEmail[]>([]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSince, setFilterSince]     = useState('');
  const [loading, setLoading]             = useState(false);
  const [processing, setProcessing]       = useState(false);
  const [error, setError]                 = useState<string | null>(null);

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

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
  };

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
      // Si estamos en otra pestaña, volvemos a pendientes para ver el resultado
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
          style={{ ...styles.btnProcess, opacity: processing ? 0.6 : 1 }}
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
          {!loading && pending.length === 0 && (
            <p style={styles.info}>No hay correos no leídos. ¡Bandeja al día!</p>
          )}
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
              placeholder="Desde fecha"
            />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              style={styles.filterInput}
            >
              <option value="">Todas las categorías</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button style={styles.btnFilter} onClick={handleHistoryFilter}>
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

// ── Componente interno: tarjeta de correo procesado ──────────────────────────

const colorPalette: Record<string, { bg: string; text: string }> = {};
const palette = [
  { bg: '#fef2f2', text: '#dc2626' },
  { bg: '#eff6ff', text: '#2563eb' },
  { bg: '#f0fdf4', text: '#16a34a' },
  { bg: '#fff7ed', text: '#ea580c' },
  { bg: '#fdf4ff', text: '#9333ea' },
  { bg: '#f9fafb', text: '#6b7280' },
];
let paletteIndex = 0;

function colorFor(category: string) {
  if (!colorPalette[category]) {
    colorPalette[category] = palette[paletteIndex % palette.length];
    paletteIndex++;
  }
  return colorPalette[category];
}

function ProcessedEmailCard({ email, showDate = false }: { email: ProcessedEmail; showDate?: boolean }) {
  const colors = colorFor(email.category);
  const time = new Date(email.processed_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const date = new Date(email.processed_at).toLocaleDateString('es-ES');

  return (
    <div style={cardStyles.card}>
      <div style={cardStyles.header}>
        <span style={{ ...cardStyles.badge, background: colors.bg, color: colors.text }}>
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
  title:   { margin: 0, fontSize: '1.25rem', fontWeight: 700 },
  btnProcess: {
    background: '#4f46e5', color: '#fff', border: 'none',
    borderRadius: '6px', padding: '0.5rem 1.1rem',
    cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
  },
  tabs: { display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0' },
  tab: {
    background: 'none', border: 'none', padding: '0.5rem 1rem',
    cursor: 'pointer', fontSize: '0.875rem', color: '#6b7280',
    borderBottom: '2px solid transparent', marginBottom: '-1px',
  },
  tabActive: { color: '#4f46e5', fontWeight: 600, borderBottom: '2px solid #4f46e5' },
  filters: { display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' },
  filterInput: {
    border: '1px solid #e5e7eb', borderRadius: '6px',
    padding: '0.4rem 0.75rem', fontSize: '0.875rem',
  },
  btnFilter: {
    background: '#f3f4f6', border: '1px solid #e5e7eb',
    borderRadius: '6px', padding: '0.4rem 1rem',
    cursor: 'pointer', fontSize: '0.875rem',
  },
  list:  { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  info:  { color: '#6b7280', fontSize: '0.9rem' },
  error: { color: '#dc2626', fontSize: '0.9rem' },
};

const cardStyles: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff', border: '1px solid #e5e7eb',
    borderRadius: '8px', padding: '1rem 1.25rem',
    display: 'flex', flexDirection: 'column', gap: '0.35rem',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: { fontSize: '0.75rem', fontWeight: 600, padding: '2px 10px', borderRadius: '999px' },
  time:  { fontSize: '0.78rem', color: '#9ca3af' },
  subject: { margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#111827' },
  sender:  { margin: 0, fontSize: '0.82rem', color: '#6b7280' },
  summary: { margin: 0, fontSize: '0.875rem', color: '#374151', lineHeight: 1.5 },
};
