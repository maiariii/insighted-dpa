import React from 'react';
import { StatCard, CompletionStatCard } from './StatCard';

export default {
  title: 'Components/StatCard',
  component: StatCard,
  parameters: {
    docs: { description: { component: 'Glassmorphic summary stat card from the HomeDashboard row. Use CompletionStatCard for the progress bar variant.' } },
  },
};

export const Default = {
  args: {
    label: 'Total Unfilled Items',
    value: '1,458',
  },
};

export const Audited = {
  args: {
    label: 'Audited Items',
    value: '947',
  },
};

export const Remaining = {
  args: {
    label: 'Remaining Items',
    value: '511',
  },
};

export const Completion = () => <CompletionStatCard percent={65.0} />;

export const FourCardRow = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
    <StatCard label="Total Unfilled Items" value="1,458" />
    <StatCard label="Audited Items" value="947" />
    <StatCard label="Remaining Items" value="511" />
    <CompletionStatCard percent={65.0} />
  </div>
);
