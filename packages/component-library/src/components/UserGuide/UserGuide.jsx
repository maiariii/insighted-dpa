import React, { useState, useEffect } from 'react';
import { ZoomIn, RotateCcw, ChevronDown, ChevronUp, Sparkles, BookOpen } from 'lucide-react';
import styles from './UserGuide.module.css';

/**
 * UserGuide
 *
 * Accordion-based help/guide UI pattern extracted from apps/frontend/src/pages/UserGuide.jsx.
 * The structural shell is preserved exactly; section content is passed via props.
 *
 * Features preserved from source:
 *  - Font-scale magnifier (100% / 120% / 140%) with localStorage persistence
 *  - Expand All / Collapse All controls
 *  - Numbered accordion sections with icon, title, subtitle, and chevron toggle
 *  - Accessibility features card slot
 *  - Teal accent colour scheme and card-glass aesthetics
 *
 * @param {Object}   props
 * @param {string}   [props.title]          - Main page heading
 * @param {string}   [props.subtitle]       - Subheading beneath the title
 * @param {string}   [props.badgeLabel]     - Pill badge text above the heading
 * @param {Array}    props.sections         - Guide sections (see below)
 * @param {string}   [props.localStorageKey] - Key for persisting font scale (default 'iu_guide_font_scale')
 *
 * Section shape:
 *   { key: string, title: string, subtitle?: string, icon?: ReactNode, content: ReactNode }
 */
export const UserGuide = ({
  title = 'User Guide',
  subtitle = 'Step-by-step documentation. Use the magnifier controls to resize text for comfortable reading.',
  badgeLabel = 'Interactive Help Desk & Workflow Guide',
  sections = [],
  localStorageKey = 'iu_guide_font_scale',
}) => {
  const [fontScale, setFontScale] = useState(() => {
    try {
      const saved = localStorage.getItem(localStorageKey);
      return saved ? parseFloat(saved) : 1.0;
    } catch {
      return 1.0;
    }
  });

  const [expandedSections, setExpandedSections] = useState(() =>
    Object.fromEntries(sections.map((s, i) => [s.key, i === 0]))
  );

  useEffect(() => {
    try { localStorage.setItem(localStorageKey, fontScale.toString()); } catch { /* ignore */ }
  }, [fontScale, localStorageKey]);

  const toggleSection = (key) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const expandAll = () =>
    setExpandedSections(Object.fromEntries(sections.map(s => [s.key, true])));

  const collapseAll = () =>
    setExpandedSections(Object.fromEntries(sections.map(s => [s.key, false])));

  // Typography size helpers — mirrors source UserGuide.jsx
  const textSizeClass =
    fontScale >= 1.4 ? styles.textLg :
    fontScale >= 1.2 ? styles.textBase :
    styles.textSm;

  const subtextSizeClass =
    fontScale >= 1.4 ? styles.textBase :
    fontScale >= 1.2 ? styles.textSm :
    styles.textXs;

  const headingSizeClass =
    fontScale >= 1.4 ? styles.headingXl :
    fontScale >= 1.2 ? styles.headingLg :
    styles.headingBase;

  return (
    <div className={styles.root}>
      {/* ── Top banner ─────────────────────────────────────────────── */}
      <div className={styles.bannerCard}>
        <div className={styles.sheen} />
        <div className={styles.bannerInner}>
          {/* Title block */}
          <div className={styles.bannerLeft}>
            <div className={styles.badge}>
              <Sparkles className={styles.badgeIcon} />
              {badgeLabel}
            </div>
            <h1 className={styles.mainTitle}>{title}</h1>
            <p className={styles.mainSubtitle}>{subtitle}</p>
          </div>

          {/* Font magnifier card */}
          <div className={styles.magnifierCard}>
            <div className={styles.magnifierHeader}>
              <span className={styles.magnifierLabel}>
                <ZoomIn className={styles.magnifierIcon} />
                Text Size Controls
              </span>
              <span className={styles.magnifierBadge}>{Math.round(fontScale * 100)}%</span>
            </div>

            <div className={styles.magnifierBtns}>
              {[
                { scale: 1.0, text: 'A', sub: 'Default' },
                { scale: 1.2, text: 'A+', sub: 'Large' },
                { scale: 1.4, text: 'A++', sub: 'XL' },
              ].map(({ scale, text, sub }) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => setFontScale(scale)}
                  className={`${styles.magnifierBtn} ${fontScale === scale ? styles.magnifierBtnActive : ''}`}
                  title={`${sub} font size (${Math.round(scale * 100)}%)`}
                >
                  <span>{text}</span>
                  <span className={styles.magnifierBtnSub}>{sub}</span>
                </button>
              ))}
            </div>

            <div className={styles.magnifierFooter}>
              <span>Preference saved locally</span>
              <button onClick={() => setFontScale(1.0)} className={styles.resetBtn}>
                <RotateCcw className={styles.resetIcon} /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* Expand / Collapse toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft}>
            <BookOpen className={styles.toolbarIcon} />
            <span className={styles.toolbarCount}>{sections.length} Core System Module{sections.length !== 1 ? 's' : ''}</span>
          </div>
          <div className={styles.toolbarRight}>
            <button onClick={expandAll}   className={styles.toolbarBtn}>Expand All Sections</button>
            <button onClick={collapseAll} className={styles.toolbarBtn}>Collapse All</button>
          </div>
        </div>
      </div>

      {/* ── Accordion sections ─────────────────────────────────────── */}
      <div className={styles.accordionStack}>
        {sections.map((section, idx) => {
          const isOpen = !!expandedSections[section.key];
          return (
            <div key={section.key} className={styles.accordionItem}>
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                className={styles.accordionTrigger}
              >
                <div className={styles.accordionTriggerLeft}>
                  <div className={styles.sectionNumber}>{idx + 1}</div>
                  <div>
                    <h2 className={`${styles.sectionTitle} ${headingSizeClass}`}>{section.title}</h2>
                    {section.subtitle && (
                      <p className={`${styles.sectionSubtitle} ${subtextSizeClass}`}>{section.subtitle}</p>
                    )}
                  </div>
                </div>
                <div className={styles.chevron}>
                  {isOpen ? <ChevronUp className={styles.chevronIcon} /> : <ChevronDown className={styles.chevronIcon} />}
                </div>
              </button>

              {isOpen && (
                <div className={`${styles.accordionBody} ${textSizeClass}`}>
                  {section.content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserGuide;
