// Design tokens centralizados — AI Futuristic Glow
// Todos los componentes deben importar desde aquí, no hardcodear valores visuales

export const theme = {
  colors: {
    bg:          '#0B0F19',
    surface:     '#111827',
    surfaceHigh: '#1a2234',       // cards elevadas, hover

    border:      'rgba(255,255,255,0.08)',
    borderGlow:  'rgba(99,102,241,0.4)',

    gradientStart: '#6366F1',
    gradientEnd:   '#A855F7',
    accent:        '#22D3EE',

    textPrimary:   '#E5E7EB',
    textSecondary: '#9CA3AF',
    textMuted:     '#6B7280',

    danger:  '#F87171',
    success: '#34D399',
    warning: '#FBBF24',

    // Categorías de email — colores semitransparentes para dark theme
    categoryColors: {
      urgente:     { bg: 'rgba(248,113,113,0.15)',  text: '#F87171',  border: 'rgba(248,113,113,0.3)' },
      reunion:     { bg: 'rgba(99,102,241,0.15)',   text: '#818CF8',  border: 'rgba(99,102,241,0.3)' },
      informativo: { bg: 'rgba(52,211,153,0.15)',   text: '#34D399',  border: 'rgba(52,211,153,0.3)' },
      promocion:   { bg: 'rgba(251,191,36,0.15)',   text: '#FBBF24',  border: 'rgba(251,191,36,0.3)' },
      otro:        { bg: 'rgba(156,163,175,0.15)',  text: '#9CA3AF',  border: 'rgba(156,163,175,0.3)' },
    } as Record<string, { bg: string; text: string; border: string }>,
  },

  fonts: {
    heading: "'Space Grotesk', sans-serif",
    body:    "'Inter', sans-serif",
    mono:    "'IBM Plex Mono', monospace",
  },

  shadows: {
    card:       '0 0 0 1px rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.4)',
    glow:       '0 0 20px rgba(99,102,241,0.35)',
    glowAccent: '0 0 20px rgba(34,211,238,0.3)',
    modal:      '0 8px 48px rgba(0,0,0,0.7)',
  },

  gradients: {
    primary: 'linear-gradient(135deg, #6366F1, #A855F7)',
    surface: 'linear-gradient(180deg, rgba(99,102,241,0.05) 0%, transparent 100%)',
  },

  radius: {
    sm:   '6px',
    md:   '10px',
    lg:   '14px',
    pill: '999px',
  },

  // Paleta para gráficas (Recharts) — versiones claras sobre fondo oscuro
  chartColors: ['#818CF8', '#F87171', '#34D399', '#FBBF24', '#A78BFA', '#22D3EE', '#FB923C'],
} as const;

// Botones reutilizables — exportados como objetos CSSProperties
export const btnStyles = {
  primary: {
    background: theme.gradients.primary,
    color: '#fff',
    border: 'none',
    borderRadius: theme.radius.sm,
    padding: '0.5rem 1.25rem',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    fontFamily: theme.fonts.body,
    transition: 'box-shadow 0.2s ease',
  } as React.CSSProperties,

  secondary: {
    background: 'transparent',
    color: theme.colors.textSecondary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    padding: '0.4rem 1rem',
    fontWeight: 500,
    fontSize: '0.875rem',
    cursor: 'pointer',
    fontFamily: theme.fonts.body,
    transition: 'all 0.15s ease',
  } as React.CSSProperties,

  danger: {
    background: 'rgba(248,113,113,0.12)',
    color: theme.colors.danger,
    border: '1px solid rgba(248,113,113,0.3)',
    borderRadius: theme.radius.sm,
    padding: '0.4rem 1rem',
    fontWeight: 500,
    fontSize: '0.875rem',
    cursor: 'pointer',
    fontFamily: theme.fonts.body,
  } as React.CSSProperties,
};

// Importar React para los tipos CSSProperties
import type React from 'react';
