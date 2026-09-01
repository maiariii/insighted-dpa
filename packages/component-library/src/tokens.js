/**
 * InsightED Design Tokens — JS Export
 * =====================================
 * Mirrors tokens.css for use in JS contexts (e.g. Chart.js inline styles)
 * where CSS custom properties cannot be read at render time.
 *
 * Colours are duplicated here intentionally: CSS variables are the canonical
 * runtime source; this file is the static build-time reference for charts.
 */

export const colors = {
  blue:   '#0f5fb7',
  blue2:  '#2783de',
  yellow: '#f7c948',
  red:    '#d62828',
  green:  '#1f9d55',
  orange: '#d97706',
};

export const semantic = {
  ink:    '#172033',
  muted:  '#667085',
  inkDark: '#f8fafc',
  mutedDark: 'rgba(255,255,255,0.68)',
};

/** Standard palette used for Doughnut / Histogram chart segments */
export const chartPalette = [
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#64748b', // slate-500
];

/** Vacancy aging status → bar colour mapping (mirrors HomeDashboard.jsx getAgingColor) */
export const agingColors = {
  'newly created': { bg: 'rgba(59, 130, 246, 0.85)',  border: '#2563eb' },
  'long-term':     { bg: 'rgba(239, 68, 68, 0.85)',   border: '#dc2626' },
  'unfilled':      { bg: 'rgba(239, 68, 68, 0.85)',   border: '#dc2626' },
  'extended':      { bg: 'rgba(249, 115, 22, 0.85)',  border: '#ea580c' },
  'new':           { bg: 'rgba(16, 185, 129, 0.85)',  border: '#059669' },
  'aging':         { bg: 'rgba(139, 92, 246, 0.85)',  border: '#7c3aed' },
  default:         { bg: 'rgba(100, 116, 139, 0.85)', border: '#475569' },
};

export const radius = {
  card:   '16px',
  button: '14px',
  pill:   '999px',
};

export const font = {
  family: '"Plus Jakarta Sans", "DM Sans", ui-sans-serif, system-ui, sans-serif',
};
