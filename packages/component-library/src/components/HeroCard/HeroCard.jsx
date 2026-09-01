import React from 'react';
import styles from './HeroCard.module.css';

/**
 * HeroCard
 *
 * Top header banner — eyebrow label, large title, subtitle/description,
 * and an optional "Refresh Data" action button in the corner.
 *
 * Maps 1:1 to the existing Header + .topbar pattern in the source app.
 *
 * @param {Object}   props
 * @param {string}   [props.eyebrowPrimary]   - Left eyebrow label (e.g. "DEPARTMENT OF EDUCATION")
 * @param {string}   [props.eyebrowSecondary] - Right eyebrow label (e.g. "HROD & INFRASTRUCTURE")
 * @param {string}   [props.title]            - Large bold title
 * @param {string}   [props.subtitle]         - Muted description line below the title
 * @param {Function} [props.onRefresh]        - If provided, renders the Refresh button
 * @param {boolean}  [props.isRefreshing]     - Shows "Refreshing…" text while true
 */
export const HeroCard = ({
  eyebrowPrimary = 'Department of Education',
  eyebrowSecondary = 'HROD & Infrastructure',
  title = 'DepEd Personnel Audit',
  subtitle = 'Live summary of unfilled plantilla items and vacancy reasons.',
  onRefresh,
  isRefreshing = false,
}) => (
  <header className={styles.portalHeader}>
    <div className={styles.topbar}>
      <div className={styles.eyebrow}>
        {eyebrowPrimary && (
          <span className={styles.eyebrowPrimary}>{eyebrowPrimary}</span>
        )}
        {eyebrowPrimary && eyebrowSecondary && (
          <span className={styles.eyebrowDivider}>|</span>
        )}
        {eyebrowSecondary && (
          <span className={styles.eyebrowSecondary}>{eyebrowSecondary}</span>
        )}
      </div>

      <div className={styles.titleRow}>
        <h2 className={styles.title}>{title}</h2>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className={styles.refreshBtn}
          >
            {isRefreshing ? 'Refreshing…' : '⟳ Refresh Data'}
          </button>
        )}
      </div>

      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  </header>
);

export default HeroCard;
