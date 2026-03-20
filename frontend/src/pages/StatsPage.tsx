import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  BarChart,
} from 'recharts';
import type { CategoryStats, DailyVolume, SenderStat } from '../types';
import { fetchCategoryStats, fetchDailyStats, fetchTopSenders } from '../services/api';

// Paleta de colores para categorías dinámicas
const COLORS = ['#4f46e5', '#dc2626', '#16a34a', '#ea580c', '#9333ea', '#0891b2', '#ca8a04'];

function getColor(index: number) {
  return COLORS[index % COLORS.length];
}

export default function StatsPage() {
  const [categoryStats, setCategoryStats] = useState<CategoryStats | null>(null);
  const [dailyData, setDailyData]         = useState<DailyVolume[]>([]);
  const [senders, setSenders]             = useState<SenderStat[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [cats, daily, tops] = await Promise.all([
          fetchCategoryStats(),
          fetchDailyStats(30),
          fetchTopSenders(10),
        ]);
        setCategoryStats(cats);
        setDailyData(daily.daily);
        setSenders(tops.senders);
      } catch {
        setError('No se pudo conectar con el backend. ¿Está corriendo en el puerto 8000?');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div style={styles.page}><p style={styles.info}>Cargando estadísticas...</p></div>;
  if (error)   return <div style={styles.page}><p style={styles.error}>{error}</p></div>;

  // Datos para el donut
  const pieData = categoryStats
    ? Object.entries(categoryStats.by_category).map(([name, value]) => ({ name, value }))
    : [];

  // Mostrar aviso si no hay datos históricos aún
  const noData = categoryStats?.total === 0;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Estadísticas</h1>

      {noData && (
        <p style={styles.info}>
          Aún no hay datos históricos. Pulsa "Procesar ahora" en la vista de correos para empezar a acumular estadísticas.
        </p>
      )}

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      {categoryStats && !noData && (
        <>
          <p style={styles.subtitle}>Total histórico: <strong>{categoryStats.total}</strong> correos procesados</p>
          <div style={styles.kpiRow}>
            {Object.entries(categoryStats.by_category).map(([cat, count], i) => (
              <div key={cat} style={{ ...styles.kpiCard, borderTop: `4px solid ${getColor(i)}` }}>
                <span style={{ ...styles.kpiCount, color: getColor(i) }}>{count}</span>
                <span style={styles.kpiLabel}>{cat}</span>
              </div>
            ))}
          </div>

          {/* ── Gráficas ─────────────────────────────────────────────── */}
          <div style={styles.chartsRow}>

            {/* Donut — distribución por categoría */}
            <div style={styles.chartBox}>
              <h2 style={styles.chartTitle}>Distribución por categoría</h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={getColor(i)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: unknown) => [`${value} correos`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Barras + Línea — volumen diario */}
            <div style={styles.chartBox}>
              <h2 style={styles.chartTitle}>Correos por día (últimos 30 días)</h2>
              {dailyData.length === 0 ? (
                <p style={styles.info}>Sin datos de días anteriores aún.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11 }}
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" name="Correos" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Tendencia"
                      stroke="#ea580c"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top remitentes — barras horizontales */}
          {senders.length > 0 && (
            <div style={{ ...styles.chartBox, marginTop: '1.5rem' }}>
              <h2 style={styles.chartTitle}>Top remitentes</h2>
              <p style={styles.chartSubtitle}>Útil para decidir darse de baja de newsletters o servicios</p>
              <ResponsiveContainer width="100%" height={senders.length * 40 + 40}>
                <BarChart
                  data={senders}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="sender"
                    tick={{ fontSize: 11 }}
                    width={180}
                  />
                  <Tooltip formatter={(value: unknown) => [`${value} correos`, 'Total']} />
                  <Bar dataKey="count" name="Correos" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page:          { padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' },
  title:         { margin: '0 0 0.25rem', fontSize: '1.25rem', fontWeight: 700 },
  subtitle:      { color: '#6b7280', fontSize: '0.9rem', margin: '0 0 1.25rem' },
  kpiRow:        { display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' },
  kpiCard:       {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '110px',
    gap: '0.25rem',
  },
  kpiCount:      { fontSize: '2rem', fontWeight: 700, lineHeight: 1 },
  kpiLabel:      { fontSize: '0.8rem', color: '#6b7280', fontWeight: 500 },
  chartsRow:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' },
  chartBox:      {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1.25rem',
  },
  chartTitle:    { margin: '0 0 0.25rem', fontSize: '0.95rem', fontWeight: 600 },
  chartSubtitle: { margin: '0 0 1rem', fontSize: '0.8rem', color: '#9ca3af' },
  info:          { color: '#6b7280', fontSize: '0.9rem' },
  error:         { color: '#dc2626', fontSize: '0.9rem' },
};
