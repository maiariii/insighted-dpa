import React from 'react';
import styles from './StatCard.module.css';

/**
 * StatCard
 *
 * Glass summary card used in the HomeDashboard row — label, large number, and
 * an optional slot for extra content (e.g. an inline progress bar for the
 * Completion Progress variant).
 *
 * @param {Object}    props
 * @param {string}    props.label     - Upper muted label
 * @param {string|number} props.value - Large displayed value (formatted externally)
 * @param {React.ReactNode} [props.children] - Optional slot rendered below the value
 */
export const StatCard = ({ label, value, children }) => (
  <div className={styles.card}>
    <div className={styles.sheen} />
    <span className={styles.label}>{label}</span>
    <strong className={styles.value}>{value}</strong>
    {children && <div className={styles.extra}>{children}</div>}
  </div>
);

/**
 * CompletionStatCard
 *
 * Pre-composed StatCard variant that includes the inline progress bar,
 * matching the "Completion Progress" card in HomeDashboard.
 *
 * @param {Object} props
 * @param {number} props.percent  - 0–100
 */
export const CompletionStatCard = ({ percent = 0 }) => {
  const safePct = Math.min(100, Math.max(0, percent));
  return (
    <StatCard label="Completion Progress" value={`${safePct}%`}>
      <div className={styles.inlineProgressTrack}>
        <div className={styles.inlineProgressFill} style={{ width: `${safePct}%` }} />
      </div>
    </StatCard>
  );
};

export default StatCard;
