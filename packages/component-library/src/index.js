/**
 * @insighted/ui — InsightED Component Library
 * ============================================
 * Export surface for all components and design tokens.
 *
 * Usage:
 *   import { Sidebar, HeroCard, KpiCard } from '@insighted/ui';
 *   import '@insighted/ui/tokens.css';           // import CSS tokens once at app root
 */

// ── Components ────────────────────────────────────────────────────────── //

export { Sidebar }             from './components/Sidebar/Sidebar.jsx';
export { HeroCard }            from './components/HeroCard/HeroCard.jsx';
export { KpiCard, KpiCardGrid } from './components/KpiCard/KpiCard.jsx';
export { StatCard, CompletionStatCard } from './components/StatCard/StatCard.jsx';
export { HistogramCard }       from './components/HistogramCard/HistogramCard.jsx';
export { DonutCard }           from './components/DonutCard/DonutCard.jsx';
export { DataTable }           from './components/DataTable/DataTable.jsx';
export { Button }              from './components/Button/Button.jsx';
export { UserGuide }           from './components/UserGuide/UserGuide.jsx';

// ── Design tokens (JS) ────────────────────────────────────────────────── //

export { colors, semantic, chartPalette, agingColors, radius, font } from './tokens.js';
