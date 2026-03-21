import { theme, btnStyles } from '../theme';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Modal de confirmación dark theme.
 * Reemplaza window.confirm() en todo el proyecto.
 */
export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Eliminar',
  onConfirm,
  onClose,
}: Props) {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      {/* stopPropagation evita que el click en el modal cierre el overlay */}
      <div style={styles.modal} onClick={e => e.stopPropagation()}>

        {/* Icono de advertencia */}
        <div style={styles.iconWrap}>
          <span style={styles.icon}>⚠️</span>
        </div>

        <h3 style={styles.title}>{title}</h3>
        <p style={styles.message}>{message}</p>

        <div style={styles.actions}>
          <button className="btn-secondary" style={btnStyles.secondary} onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn-danger"
            style={btnStyles.danger}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,       // encima de otros modales
  },
  modal: {
    background: theme.colors.surface,
    border: `1px solid rgba(248,113,113,0.2)`,  // toque rojo sutil por ser destructivo
    borderRadius: theme.radius.lg,
    padding: '2rem 1.75rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: `${theme.shadows.modal}, 0 0 30px rgba(248,113,113,0.08)`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    textAlign: 'center',
  },
  iconWrap: {
    marginBottom: '0.25rem',
  },
  icon: {
    fontSize: '2.25rem',
    lineHeight: 1,
  },
  title: {
    margin: '0.25rem 0 0',
    fontFamily: theme.fonts.heading,
    fontSize: '1.05rem',
    fontWeight: 700,
    color: theme.colors.textPrimary,
  },
  message: {
    margin: '0.25rem 0 1rem',
    fontFamily: theme.fonts.body,
    fontSize: '0.875rem',
    color: theme.colors.textSecondary,
    lineHeight: 1.6,
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
    width: '100%',
  },
};
