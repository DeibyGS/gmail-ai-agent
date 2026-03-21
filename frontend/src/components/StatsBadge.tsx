import type { EmailCategory } from '../types';
import { theme } from '../theme';

interface Props {
  category: EmailCategory;
  count: number;
}

const categoryLabels: Record<EmailCategory, string> = {
  urgente:     'Urgentes',
  reunion:     'Reuniones',
  informativo: 'Informativos',
  otro:        'Otros',
};

export default function StatsBadge({ category, count }: Props) {
  const colors = theme.colors.categoryColors[category] ?? theme.colors.categoryColors['otro'];

  return (
    <div style={{
      ...styles.badge,
      background: colors.bg,
      border: `1px solid ${colors.border}`,
    }}>
      <span style={{ ...styles.count, color: colors.text, fontFamily: theme.fonts.heading }}>
        {count}
      </span>
      <span style={{ ...styles.label, color: colors.text }}>
        {categoryLabels[category]}
      </span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  badge: {
    borderRadius: theme.radius.md,
    padding: '1.25rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
    minWidth: '120px',
  },
  count: {
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1,
  },
  label: {
    fontFamily: theme.fonts.body,
    fontSize: '0.82rem',
    fontWeight: 500,
  },
};
