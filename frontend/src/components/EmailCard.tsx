import type { Email } from '../types';

interface Props {
  email: Email;
}

// Paleta de colores rotativa para categorías dinámicas que Gemini puede devolver
const colorPalette = [
  { bg: '#fef2f2', text: '#dc2626' },
  { bg: '#eff6ff', text: '#2563eb' },
  { bg: '#f0fdf4', text: '#16a34a' },
  { bg: '#fff7ed', text: '#ea580c' },
  { bg: '#fdf4ff', text: '#9333ea' },
  { bg: '#f9fafb', text: '#6b7280' },
];

// Asigna un color consistente a cada categoría según su posición en el orden de aparición
const categoryColorCache: Record<string, { bg: string; text: string }> = {};
let colorIndex = 0;

function getColorForCategory(category: string) {
  if (!categoryColorCache[category]) {
    categoryColorCache[category] = colorPalette[colorIndex % colorPalette.length];
    colorIndex++;
  }
  return categoryColorCache[category];
}

export default function EmailCard({ email }: Props) {
  const colors = getColorForCategory(email.category);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={{ ...styles.badge, background: colors.bg, color: colors.text }}>
          {email.category}
        </span>
      </div>

      <h3 style={styles.subject}>{email.subject}</h3>
      <p style={styles.sender}>De: {email.sender}</p>
      <p style={styles.summary}>{email.summary}</p>

      {/* Si Gemini detectó datos de reunión, los mostramos como detalle extra */}
      {email.event_data && (
        <div style={styles.eventData}>
          <strong>Reunión:</strong> {email.event_data.title}
          {email.event_data.date && ` · ${email.event_data.date}`}
          {email.event_data.time && ` a las ${email.event_data.time}`}
          {email.event_data.location && ` — ${email.event_data.location}`}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '2px 10px',
    borderRadius: '999px',
    textTransform: 'capitalize',
  },
  subject: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#111827',
  },
  sender: {
    margin: 0,
    fontSize: '0.82rem',
    color: '#6b7280',
  },
  summary: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#374151',
    lineHeight: 1.5,
  },
  eventData: {
    marginTop: '0.25rem',
    fontSize: '0.82rem',
    background: '#eff6ff',
    color: '#1e40af',
    padding: '6px 10px',
    borderRadius: '6px',
  },
};
