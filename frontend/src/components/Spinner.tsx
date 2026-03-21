import { theme } from '../theme';

interface Props {
  /** Diámetro del anillo en px (default: 36) */
  size?: number;
  /** Texto opcional bajo el spinner */
  label?: string;
}

/**
 * Spinner animado con glow violeta del design system.
 * Reemplaza los textos "Cargando..." en toda la app.
 */
export default function Spinner({ size = 36, label }: Props) {
  return (
    <div style={styles.wrap}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: `3px solid rgba(99,102,241,0.15)`,
          borderTopColor: theme.colors.gradientStart,
          boxShadow: `0 0 12px rgba(99,102,241,0.35)`,
          animation: 'spinner-rotate 0.75s linear infinite',
        }}
      />
      {label && <span style={styles.label}>{label}</span>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: '2.5rem 1rem',
  },
  label: {
    fontFamily: theme.fonts.body,
    fontSize: '0.875rem',
    color: theme.colors.textMuted,
  },
};
