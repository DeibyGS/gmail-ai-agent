import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  BarChart,
} from 'recharts';
import type { CategoryStats, DailyVolume, SenderStat } from '../types';
import { fetchCategoryStats, fetchDailyStats, fetchTopSenders } from '../services/api';
import Spinner from '../components/Spinner';
import { theme } from '../theme';

// Colores para gráficas — adaptados al dark theme
const CHART_COLORS = theme.chartColors;

function getColor(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

// Estilos de tooltip personalizados para Recharts en dark theme
const tooltipStyle = {
  backgroundColor: theme.colors.surfaceHigh,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.radius.sm,
  color: theme.colors.textPrimary,
  fontFamily: theme.fonts.body,
  fontSize: '0.85rem',
};

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

  if (loading) return <div style={styles.page}><Spinner label="Cargando estadísticas..." /></div>;
  if (error)   return <div style={styles.page}><p style={styles.error}>{error}</p></div>;

  // Datos para el donut
  const pieData = categoryStats
    ? Object.entries(categoryStats.by_category).map(([name, value]) => ({ name, value }))
    : [];

  const noData = categoryStats?.total === 0;

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Estadísticas</h1>

      {noData && (
        <p style={styles.info}>
          Aún no hay datos históricos. Pulsa "Procesar ahora" en la vista de correos para empezar a acumular estadísticas.
        </p>
      )}

      {categoryStats && !noData && (
        <>
          <p style={styles.subtitle}>
            Total histórico: <strong style={{ color: theme.colors.textPrimary }}>{categoryStats.total}</strong> correos procesados
          </p>

          {/* ── KPI Cards ──────────────────────────────────────────────── */}
          <div style={styles.kpiRow}>
            {Object.entries(categoryStats.by_category).map(([cat, count], i) => (
              <div key={cat} style={{ ...styles.kpiCard, borderTop: `3px solid ${getColor(i)}` }}>
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
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={getColor(i)} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: unknown) => [`${value} correos`, '']}
                  />
                  <Legend
                    wrapperStyle={{ fontFamily: theme.fonts.body, fontSize: '0.82rem', color: theme.colors.textSecondary }}
                  />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: theme.colors.textMuted, fontFamily: theme.fonts.mono }}
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: theme.colors.textMuted, fontFamily: theme.fonts.mono }}
                      allowDecimals={false}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="total" name="Correos" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      name="Tendencia"
                      stroke={CHART_COLORS[2]}
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
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: theme.colors.textMuted, fontFamily: theme.fonts.mono }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="sender"
                    tick={{ fontSize: 11, fill: theme.colors.textMuted, fontFamily: theme.fonts.body }}
                    width={180}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: unknown) => [`${value} correos`, 'Total']}
                  />
                  <Bar dataKey="count" name="Correos" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
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
  page:         { padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' },
  title:        { margin: '0 0 0.25rem', fontFamily: theme.fonts.heading, fontSize: '1.25rem', fontWeight: 700, color: theme.colors.textPrimary },
  subtitle:     { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: '0.9rem', margin: '0 0 1.25rem' },
  kpiRow:       { display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' },
  kpiCard: {
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    boxShadow: theme.shadows.card,
    padding: '1rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '110px',
    gap: '0.25rem',
  },
  kpiCount:     { fontFamily: theme.fonts.heading, fontSize: '2rem', fontWeight: 700, lineHeight: 1 },
  kpiLabel:     { fontFamily: theme.fonts.body, fontSize: '0.8rem', color: theme.colors.textMuted, fontWeight: 500 },
  chartsRow:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' },
  chartBox: {
    background: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    boxShadow: theme.shadows.card,
    padding: '1.25rem',
  },
  chartTitle:    { margin: '0 0 0.25rem', fontFamily: theme.fonts.heading, fontSize: '0.95rem', fontWeight: 600, color: theme.colors.textPrimary },
  chartSubtitle: { margin: '0 0 1rem', fontFamily: theme.fonts.body, fontSize: '0.8rem', color: theme.colors.textMuted },
  info:          { color: theme.colors.textMuted, fontFamily: theme.fonts.body, fontSize: '0.9rem' },
  error:         { color: theme.colors.danger,    fontFamily: theme.fonts.body, fontSize: '0.9rem' },
};
