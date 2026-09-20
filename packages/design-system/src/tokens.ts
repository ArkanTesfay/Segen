/**
 * Segen design tokens — STRICT palette:
 * silky black / silky white / red ONLY (+ alpha opacities).
 * No other hues allowed.
 */
export const colors = {
  silk: {
    black: '#0A0A0B',
    surface: '#131316',
    elevated: '#1C1C20',
    line: 'rgba(249,247,241,0.12)',
    white: '#F9F7F1',
    muted: 'rgba(249,247,241,0.64)',
    faint: 'rgba(249,247,241,0.38)',
  },
  red: {
    DEFAULT: '#E50914',
    hover: '#B20710',
    glow: '#FF1A25',
  },
} as const;

export const gradients = {
  heroFade: 'linear-gradient(to top, #0A0A0B 4%, rgba(10,10,11,0.55) 38%, rgba(10,10,11,0.05) 70%, rgba(10,10,11,0.25) 100%)',
  cardShine: 'linear-gradient(135deg, rgba(249,247,241,0.14), rgba(249,247,241,0.02) 40%, rgba(229,9,20,0.22))',
  redGlow: 'radial-gradient(60% 60% at 20% 20%, rgba(229,9,20,0.55), rgba(229,9,20,0) 70%)',
} as const;

export const radii = { sm: '8px', md: '14px', lg: '22px', full: '999px' } as const;

export const shadows = {
  card: '0 18px 50px rgba(0,0,0,0.55)',
  red: '0 8px 32px rgba(229,9,20,0.45)',
} as const;

export const fonts = {
  sans: "'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  display: "'Manrope', 'Inter', ui-sans-serif, system-ui, sans-serif",
} as const;
