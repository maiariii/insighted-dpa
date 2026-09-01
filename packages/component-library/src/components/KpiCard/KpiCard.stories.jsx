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
    value: 312,
    progressPercent: 62.4,
    progressLabel: '62.4% accomplishment rate',
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
    { label: 'Teaching Personnel',         value: 312, progressPercent: 62.4, progressLabel: '62.4% accomplishment rate' },
    { label: 'Non-Teaching Personnel',     value: 89,  progressPercent: 41.6, progressLabel: '41.6% accomplishment rate' },
    { label: 'Teaching-Related Personnel', value: 57,  progressPercent: 78.9, progressLabel: '78.9% accomplishment rate' },
  ].map(c => ({
    ...c,
    isActive: active === c.label,
    onClick: () => setActive(prev => prev === c.label ? '' : c.label),
  }));
  return <KpiCardGrid cards={cards} />;
};
