import React from 'react';
import { HistogramCard } from './HistogramCard';
import { agingColors } from '../../tokens.js';

export default {
  title: 'Components/HistogramCard',
  component: HistogramCard,
  parameters: {
    docs: { description: { component: 'Bar chart card with value labels above each bar. Clicking a bar fires onBarClick. Mirrors the Vacancy Aging Distribution chart in HomeDashboard.' } },
  },
};

const resolveAgingColor = (label) => {
  const s = (label || '').toString().toLowerCase();
  for (const [key, val] of Object.entries(agingColors)) {
    if (key !== 'default' && s.includes(key)) return val;
  }
  return agingColors.default;
};

const sampleData = [
  'Long-Term Unfilled',
  'Extended Unfilled',
  'Aging',
  'New',
  'Newly Created',
].map((label) => {
  const c = resolveAgingColor(label);
  return { label, value: Math.floor(Math.random() * 200) + 20, color: c.bg, borderColor: c.border };
});

export const Default = {
  args: {
    title: 'Vacancy Aging Distribution',
    hint: 'Click bar to view items',
    data: sampleData,
    height: 260,
    isDark: false,
    onBarClick: (label) => alert(`Clicked: ${label}`),
  },
};

export const DarkMode = {
  args: { ...Default.args, isDark: true },
  parameters: { backgrounds: { default: 'dark' } },
};

export const NoHint = {
  args: { ...Default.args, hint: '' },
};
