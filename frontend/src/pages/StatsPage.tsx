import { useEffect, useState } from 'react';
import type { EmailStats } from '../types';
import { fetchStats } from '../services/api';

// Paleta de colores para categorías dinámicas (misma lógica que EmailCard)
const colorPalette = [
  { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
  { bg: '#fdf4ff', text: '#9333ea', border: '#e9d5ff' },
  { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' },
];

export default function StatsPage() {
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchStats();
        setStats(data);
      } catch {
        setError('No se pudo conectar con el backend. ¿Está corriendo en el puerto 8000?');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Estadísticas de correos</h1>

      {loading && <p style={styles.info}>Cargando estadísticas...</p>}
      {error && <p style={styles.error}>{error}</p>}

      {stats && (
        <>
          <p style={styles.total}>Total procesados: <strong>{stats.total}</strong></p>
          <div style={styles.grid}>
            {/* Iteramos sobre las categorías que realmente devuelve el backend */}
            {Object.entries(stats.by_category).map(([category, count], i) => {
              const colors = colorPalette[i % colorPalette.length];
              return (
                <div
                  key={category}
                  style={{ ...styles.badge, background: colors.bg, border: `1px solid ${colors.border}` }}
                >
                  <span style={{ ...styles.count, color: colors.text }}>{count}</span>
                  <span style={{ ...styles.label, color: colors.text }}>{category}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { padding: '1.5rem', maxWidth: '760px', margin: '0 auto' },
  title: { margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 700 },
  total: { color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.25rem' },
  grid: { display: 'flex', flexWrap: 'wrap', gap: '1rem' },
  badge: {
    borderRadius: '10px',
    padding: '1.25rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
    minWidth: '120px',
  },
  count: { fontSize: '2rem', fontWeight: 700, lineHeight: 1 },
  label: { fontSize: '0.82rem', fontWeight: 500 },
  info: { color: '#6b7280', fontSize: '0.9rem' },
  error: { color: '#dc2626', fontSize: '0.9rem' },
};
