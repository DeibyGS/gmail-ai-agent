import { NavLink } from 'react-router-dom';
import { theme } from '../theme';

// Barra de navegación principal — sticky, glassmorphism dark
export default function Navbar() {
  return (
    <nav style={styles.nav}>
      <span style={styles.brand}>Gmail AI Agent</span>
      <div style={styles.links}>
        <NavLink to="/" style={navStyle} end>Correos</NavLink>
        <NavLink to="/stats" style={navStyle}>Estadísticas</NavLink>
        <NavLink to="/calendar" style={navStyle}>Calendario</NavLink>
        <NavLink to="/briefing" style={navStyle}>Briefing</NavLink>
        <NavLink to="/settings" style={navStyle}>Ajustes</NavLink>
      </div>
    </nav>
  );
}

// navStyle recibe { isActive } que React Router inyecta automáticamente
const navStyle = ({ isActive }: { isActive: boolean }) => ({
  ...styles.link,
  color: isActive ? theme.colors.textPrimary : theme.colors.textSecondary,
  fontWeight: isActive ? 700 : 400,
  borderBottom: isActive
    ? `2px solid ${theme.colors.gradientStart}`
    : '2px solid transparent',
});

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem',
    height: '56px',
    background: 'rgba(17,24,39,0.85)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderBottom: `1px solid ${theme.colors.border}`,
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  brand: {
    fontFamily: theme.fonts.heading,
    fontWeight: 700,
    fontSize: '1.05rem',
    // Gradiente en el texto via background-clip
    background: theme.gradients.primary,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  links: {
    display: 'flex',
    gap: '1.5rem',
  },
  link: {
    textDecoration: 'none',
    fontSize: '0.875rem',
    paddingBottom: '4px',
    transition: 'color 0.15s ease, border-bottom 0.15s ease',
    fontFamily: theme.fonts.body,
  },
};
