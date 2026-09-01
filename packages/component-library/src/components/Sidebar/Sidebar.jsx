import React from 'react';
import { Moon, Sun, LogOut } from 'lucide-react';
import styles from './Sidebar.module.css';

/**
 * Sidebar
 *
 * Left icon navigation rail that collapses to icon-only width and expands on hover.
 * Decoupled from react-router-dom and app contexts — navigation, theme, auth are all
 * passed as props so the component is usable in any React app.
 *
 * @param {Object}   props
 * @param {string}   [props.logoSrc]            - src for the logo image
 * @param {string}   [props.appTitle]           - Bold title next to logo
 * @param {string}   [props.appSubtitle]        - Small subtitle next to logo
 * @param {Object}   [props.user]               - { fullName, position, location }
 * @param {Array}    [props.navItems]           - [{ to, icon: ReactNode, label, isActive }]
 * @param {string}   [props.theme]              - 'light' | 'dark'
 * @param {Function} [props.onThemeToggle]      - called when dark/light button clicked
 * @param {Function} [props.onSignOut]          - called when sign-out button clicked
 * @param {string}   [props.footerNote]         - text shown in the collapsed footer area
 * @param {Function} [props.renderNavItem]      - optional custom renderer for each nav item
 */
export const Sidebar = ({
  logoSrc,
  appTitle = 'DepEd Personnel Audit',
  appSubtitle = 'Division vacancy monitoring',
  user = {},
  navItems = [],
  theme = 'light',
  onThemeToggle,
  onSignOut,
  footerNote = "Access is scoped to the HRMO's assigned region and division.",
  renderNavItem,
}) => {
  const { fullName = 'HRMO User', position = 'Human Resource Management Officer', location = 'DepEd National Office' } = user;

  return (
    <aside className={`${styles.sidebar} ${styles.glass}`}>
      {/* Brand */}
      <div className={styles.brand}>
        {logoSrc && (
          <div className={styles.logoWrap}>
            <img src={logoSrc} alt={`${appTitle} logo`} className={styles.logoImg} />
          </div>
        )}
        <div className={`${styles.collapsibleText} ${styles.brandText}`}>
          <h1 className={styles.brandTitle}>{appTitle}</h1>
          <p className={styles.brandSubtitle}>{appSubtitle}</p>
        </div>
      </div>

      <hr className={styles.divider} />

      {/* User profile card */}
      <div className={`${styles.profileCard} ${styles.collapsibleText}`}>
        <strong className={styles.profileName}>{fullName}</strong>
        <span className={styles.profilePosition}>{position}</span>
        <span className={styles.profileLocation}>{location}</span>
      </div>

      {/* Primary navigation */}
      <nav className={styles.nav} aria-label="Primary navigation">
        {navItems.map((item, idx) =>
          renderNavItem ? (
            renderNavItem(item, idx)
          ) : (
            <a
              key={item.to ?? idx}
              href={item.to}
              className={`${styles.navLink} ${item.isActive ? styles.active : ''}`}
              aria-current={item.isActive ? 'page' : undefined}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.collapsibleText}>{item.label}</span>
            </a>
          )
        )}
      </nav>

      {/* Dark / Light mode toggle */}
      <button
        type="button"
        className={`${styles.btn} ${styles.secondary} ${styles.themeBtn}`}
        onClick={onThemeToggle}
      >
        <span>{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</span>
        <span className={styles.collapsibleText}>
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </span>
      </button>

      {/* Sign-out button */}
      <button
        type="button"
        id="sidebar-btn-signout"
        className={`${styles.btn} ${styles.secondary} ${styles.signoutBtn}`}
        onClick={onSignOut}
      >
        <LogOut size={18} />
        <span className={styles.collapsibleText}>Sign Out</span>
      </button>

      {/* Footer note */}
      <div className={`${styles.sidebarFooter} ${styles.collapsibleText}`}>
        {footerNote}
      </div>
    </aside>
  );
};

export default Sidebar;
