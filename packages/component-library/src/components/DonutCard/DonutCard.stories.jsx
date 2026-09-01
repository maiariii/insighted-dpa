import React from 'react';
import { DonutCard } from './DonutCard';

export default {
  title: 'Components/DonutCard',
  component: DonutCard,
  parameters: {
    docs: { description: { component: 'Ring chart card. Mirrors the Reasons for Vacancy Breakdown donut in HomeDashboard.' } },
  },
};

const sampleData = [
  { label: 'Retirement', value: 142 },
  { label: 'Resignation', value: 98 },
  { label: 'Death', value: 34 },
  { label: 'Transfer', value: 67 },
  { label: 'Promotion', value: 55 },
  { label: 'Abolition', value: 22 },
  { label: 'Newly Created', value: 80 },
  { label: 'Other', value: 29 },
];

export const Default = {
  args: {
    title: 'Reasons for Vacancy Breakdown',
    data: sampleData,
    height: 260,
    isDark: false,
  },
};

export const DarkMode = {
  args: { ...Default.args, isDark: true },
  parameters: { backgrounds: { default: 'dark' } },
};

export const CustomColors = {
  args: {
    title: 'Division Breakdown',
    data: [
      { label: 'Caloocan', value: 200, color: '#3b82f6' },
      { label: 'Las Piñas', value: 150, color: '#10b981' },
      { label: 'Makati',   value: 90,  color: '#f59e0b' },
      { label: 'Others',   value: 50,  color: '#6b7280' },
    ],
    height: 260,
  },
};
