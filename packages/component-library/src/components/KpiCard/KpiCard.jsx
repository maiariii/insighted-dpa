import React from 'react';
import styles from './KpiCard.module.css';

/**
 * KpiCard
 *
 * A single KPI category tile: label, large count, and an optional progress bar
 * with a completion sticker label. Clickable to filter — matches the
 * `button.personnel-tab.kpi` pattern in the source app.
 *
 * @param {Object}   props
 * @param {string}   props.label           - Category label (e.g. "Teaching Personnel")
 * @param {number}   props.value           - The large count to display
 * @param {number}   [props.progressPercent] - 0–100 completion percentage; omit to hide progress bar
 * @param {string}   [props.progressLabel] - Text shown below the bar (e.g. "62.4% accomplishment rate")
 * @param {boolean}  [props.isActive]      - Highlights the card as the active filter
 * @param {Function} [props.onClick]       - Called when the card is clicked
 */
export const KpiCard = ({
  label,
  value = 0,
  progressPercent,
  progressLabel,
  isActive = false,
  onClick,
}) => {
  const showProgress = progressPercent !== undefined && progressPercent !== null;
  const safePct = Math.min(100, Math.max(0, progressPercent ?? 0));

  return (
    <button
      type="button"
      className={`${styles.kpiCard} ${isActive ? styles.active : ''}`}
      onClick={onClick}
    >
      {/* Specular sheen overlay */}
      <div className={styles.sheen} />

      <label className={styles.label}>{label}</label>
      <strong className={styles.value}>{Number(value).toLocaleString()}</strong>

      {showProgress && (
        <div className={styles.progressWrap}>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${safePct}%` }}
            />
          </div>
          {progressLabel && (
            <span className={styles.completionSticker}>{progressLabel}</span>
          )}
        </div>
      )}
    </button>
  );
};

/**
 * KpiCardGrid
 *
 * Convenience wrapper that renders a row of KpiCards with the correct grid layout.
 *
 * @param {Object} props
 * @param {Array}  props.cards  - Array of KpiCard prop objects
 */
export const KpiCardGrid = ({ cards = [] }) => (
  <div className={styles.grid}>
    {cards.map((card, i) => (
      <KpiCard key={card.label ?? i} {...card} />
    ))}
  </div>
);

export default KpiCard;
