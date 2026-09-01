import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { chartPalette, font } from '../../tokens.js';
import styles from './DonutCard.module.css';

ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * DonutCard
 *
 * Donut / ring chart card — title, Chart.js Doughnut, and a built-in legend
 * at the right side. Mirrors the "Reasons for Vacancy Breakdown" chart in HomeDashboard.
 *
 * @param {Object}  props
 * @param {string}  [props.title]    - Card heading
 * @param {Array}   props.data       - [{ label: string, value: number, color?: string }]
 * @param {number}  [props.height]   - Chart height in px (default 260)
 * @param {boolean} [props.isDark]   - Dark-mode legend text colour
 */
export const DonutCard = ({
  title = 'Reasons for Vacancy Breakdown',
  data = [],
  height = 260,
  isDark = false,
}) => {
  const labels = data.map((d) => d.label);
  const values = data.map((d) => d.value);
  const colors = data.map((d, i) => d.color ?? chartPalette[i % chartPalette.length]);

  const legendTextColor = isDark ? '#e2e8f0' : '#334155';

  const chartData = {
    labels,
    datasets: [{ data: values, backgroundColor: colors }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          color: legendTextColor,
          font: { size: 11, family: font.family, weight: '600' },
        },
      },
    },
  };

  return (
    <div className={styles.card}>
      <div className={styles.sheen} />
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
      </div>
      <div style={{ position: 'relative', height: `${height}px`, width: '100%' }} className={styles.chartWrap}>
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
};

export default DonutCard;
