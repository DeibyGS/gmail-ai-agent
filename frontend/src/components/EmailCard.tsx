import type { Email } from '../types';
import { theme } from '../theme';

interface Props {
  email: Email;
}

// Paleta de fallback para categorías dinámicas que no estén en el theme
const fallbackPalette = [
  { bg: 'rgba(99,102,241,0.15)',  text: '#818CF8',  border: 'rgba(99,102,241,0.3)' },
  { bg: 'rgba(34,211,238,0.15)',  text: '#22D3EE',  border: 'rgba(34,211,238,0.3)' },
  { bg: 'rgba(167,139,250,0.15)', text: '#A78BFA',  border: 'rgba(167,139,250,0.3)' },
  { bg: 'rgba(251,146,60,0.15)',  text: '#FB923C',  border: 'rgba(251,146,60,0.3)' },
  { bg: 'rgba(52,211,153,0.15)',  text: '#34D399',  border: 'rgba(52,211,153,0.3)' },
  { bg: 'rgba(156,163,175,0.15)', text: '#9CA3AF',  border: 'rgba(156,163,175,0.3)' },
];

// Cache para asignar colores consistentes a categorías dinámicas
const categoryColorCache: Record<string, { bg: string; text: string; border: string }> = {};
let colorIndex = 0;

function getColorForCategory(category: string) {
  // Primero buscar en el design system; si no existe, usar fallback rotativo
  if (theme.colors.categoryColors[category]) {
    return theme.colors.categoryColors[category];
  }
  if (!categoryColorCache[category]) {
    categoryColorCache[category] = fallbackPalette[colorIndex % fallbackPalette.length];
    colorIndex++;
  }
  return categoryColorCache[category];
}

export default function EmailCard({ email }: Props) {
  const colors = getColorForCategory(email.category);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={{
          ...styles.badge,
          background: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.border}`,
        }}>
          {email.category}
        </span>
      </div>

      <h3 style={styles.subject}>{email.subject}</h3>
      <p style={styles.sender}>De: {email.sender}</p>
      <p style={styles.summary}>{email.summary}</p>

      {/* Si Gemini detectó datos de reunión, los mostramos como bloque destacado */}
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
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    padding: '1rem 1.25rem',
    boxShadow: theme.shadows.card,
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
    fontFamily: theme.fonts.mono,
    fontSize: '0.72rem',
    fontWeight: 500,
    padding: '2px 10px',
    borderRadius: theme.radius.pill,
    textTransform: 'capitalize',
  },
  subject: {
    margin: 0,
    fontFamily: theme.fonts.heading,
    fontSize: '0.95rem',
    fontWeight: 600,
    color: theme.colors.textPrimary,
  },
  sender: {
    margin: 0,
    fontFamily: theme.fonts.body,
    fontSize: '0.82rem',
    color: theme.colors.textSecondary,
  },
  summary: {
    margin: 0,
    fontFamily: theme.fonts.body,
    fontSize: '0.875rem',
    color: theme.colors.textSecondary,
    lineHeight: 1.6,
  },
  eventData: {
    marginTop: '0.25rem',
    fontFamily: theme.fonts.mono,
    fontSize: '0.8rem',
    background: 'rgba(99,102,241,0.12)',
    color: '#818CF8',
    border: '1px solid rgba(99,102,241,0.3)',
    padding: '6px 10px',
    borderRadius: theme.radius.sm,
  },
};
