import type { EmailCategory } from '../types';

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

const categoryColors: Record<EmailCategory, { bg: string; text: string; border: string }> = {
  urgente:     { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  reunion:     { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  informativo: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  otro:        { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
};

export default function StatsBadge({ category, count }: Props) {
  const colors = categoryColors[category];

  return (
    <div style={{ ...styles.badge, background: colors.bg, border: `1px solid ${colors.border}` }}>
      <span style={{ ...styles.count, color: colors.text }}>{count}</span>
      <span style={{ ...styles.label, color: colors.text }}>{categoryLabels[category]}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  badge: {
    borderRadius: '10px',
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
    fontSize: '0.82rem',
    fontWeight: 500,
  },
};
