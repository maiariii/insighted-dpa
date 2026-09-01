import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { font } from '../../tokens.js';
import styles from './HistogramCard.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * Chart.js plugin: draws numeric value labels above each bar.
 * Mirrors the valueLabelsPlugin in apps/frontend/src/pages/HomeDashboard.jsx.
 */
const valueLabelsPlugin = {
  id: 'valueLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const isDark =
      typeof document !== 'undefined' &&
      document.body.classList.contains('dark');

    chart.data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);
      if (!meta.hidden) {
        meta.data.forEach((element, index) => {
          const val = dataset.data[index];
          if (val === undefined || val === null) return;

          ctx.save();
          ctx.font = `bold 12px ${font.family}`;
          ctx.fillStyle = isDark ? '#f8fafc' : '#334155';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';

          const x = element.x;
          let y = element.y - 4;

          if (y < 16) {
            y = element.y + 16;
            ctx.fillStyle = '#ffffff';
          }

          ctx.fillText(Number(val).toLocaleString(), x, y);
          ctx.restore();
        });
      }
    });
  },
};

/**
 * HistogramCard
 *
 * Bar chart card — title, optional hint line, and a Chart.js Bar with value
 * labels above each bar. Clicking a bar fires onBarClick with the bar label.
 *
 * @param {Object}   props
 * @param {string}   [props.title]        - Card heading
 * @param {string}   [props.hint]         - Muted hint below the heading (e.g. "Click bar to view items")
 * @param {Array}    props.data           - [{ label: string, value: number, color?: string, borderColor?: string }]
 * @param {number}   [props.height]       - Chart height in px (default 260)
 * @param {boolean}  [props.isDark]       - Pass true to use dark-mode tick/grid colours
 * @param {Function} [props.onBarClick]   - (label: string) => void
 */
export const HistogramCard = ({
  title = 'Vacancy Aging Distribution',
  hint = 'Click bar to view items',
  data = [],
  height = 260,
  isDark = false,
  onBarClick,
}) => {
  const labels = data.map((d) => d.label);
  const values = data.map((d) => d.value);
  const bgColors = data.map((d) => d.color ?? 'rgba(100, 116, 139, 0.85)');
  const borderColors = data.map((d) => d.borderColor ?? '#475569');

  const textColor = isDark ? '#cbd5e1' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(226,232,240,0.5)';

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Count',
        data: values,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 24 } },
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: textColor, font: { size: 11, family: font.family } },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        grace: '20%',
        ticks: { precision: 0, color: textColor, font: { size: 11, family: font.family } },
        grid: { color: gridColor },
      },
    },
    onClick: (_event, activeElements) => {
      if (!onBarClick || !activeElements?.length) return;
      const idx = activeElements[0].index;
      const label = labels[idx];
      if (label && label !== 'No Data') onBarClick(label);
    },
  };

  return (
    <div className={styles.card}>
      <div className={styles.sheen} />
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {hint && <p className={styles.hint}>{hint}</p>}
      </div>
      <div style={{ position: 'relative', height: `${height}px`, width: '100%' }} className={styles.chartWrap}>
        <Bar data={chartData} options={options} plugins={[valueLabelsPlugin]} />
      </div>
    </div>
  );
};

export default HistogramCard;
