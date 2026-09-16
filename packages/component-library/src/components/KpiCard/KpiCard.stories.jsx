import React, { useState } from 'react';
import { KpiCard, KpiCardGrid } from './KpiCard';

export default {
  title: 'Components/KpiCard',
  component: KpiCard,
  parameters: {
    docs: {
      description: {
        component:
          'Category-filter KPI tab tile. Displays a label, a large count, and an optional progress bar. ' +
          'Use `KpiCardGrid` to render multiple cards in the correct responsive grid.',
      },
    },
  },
};

export const WithProgressBar = {
  args: {
    label: 'Teaching Personnel',
    value: 500,
    progressPercent: 62.4,
    progressLabel: '312 filled of 500 total audited unfilled plantilla items',
    isActive: false,
  },
};

export const Active = {
  args: {
    ...WithProgressBar.args,
    isActive: true,
  },
};

export const WithoutProgress = {
  args: {
    label: 'Non-Teaching Personnel',
    value: 89,
  },
};

export const Grid = () => {
  const [active, setActive] = useState('Teaching');
  const cards = [
    { label: 'Teaching Personnel',         value: 500, progressPercent: 62.4, progressLabel: '312 filled of 500 total audited unfilled plantilla items' },
    { label: 'Non-Teaching Personnel',     value: 214, progressPercent: 41.6, progressLabel: '89 filled of 214 total audited unfilled plantilla items' },
    { label: 'Teaching-Related Personnel', value: 72,  progressPercent: 78.9, progressLabel: '57 filled of 72 total audited unfilled plantilla items' },
  ].map(c => ({
    ...c,
    isActive: active === c.label,
    onClick: () => setActive(prev => prev === c.label ? '' : c.label),
  }));
  return <KpiCardGrid cards={cards} />;
};
