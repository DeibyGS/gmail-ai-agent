import { NavLink } from 'react-router-dom';

// Barra de navegación principal entre las tres vistas del agente
export default function Navbar() {
  return (
    <nav style={styles.nav}>
      <span style={styles.brand}>Gmail AI Agent</span>
      <div style={styles.links}>
        <NavLink to="/" style={navStyle} end>Correos</NavLink>
        <NavLink to="/stats" style={navStyle}>Estadísticas</NavLink>
        <NavLink to="/calendar" style={navStyle}>Calendario</NavLink>
      </div>
    </nav>
  );
}

// navStyle recibe el objeto { isActive } que React Router inyecta automáticamente
const navStyle = ({ isActive }: { isActive: boolean }) => ({
  ...styles.link,
  fontWeight: isActive ? 700 : 400,
  borderBottom: isActive ? '2px solid #4f46e5' : '2px solid transparent',
});

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1.5rem',
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
  },
  brand: {
    fontWeight: 700,
    fontSize: '1.1rem',
    color: '#4f46e5',
  },
  links: {
    display: 'flex',
    gap: '1.5rem',
  },
  link: {
    textDecoration: 'none',
    color: '#374151',
    paddingBottom: '4px',
    transition: 'border-bottom 0.15s',
  },
};
