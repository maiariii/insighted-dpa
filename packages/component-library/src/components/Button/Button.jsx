import React from 'react';
import styles from './Button.module.css';

/**
 * Button
 *
 * Primary action button covering all variants used in insighted-dpa:
 *  - primary    → blue, used as the default CTA
 *  - secondary  → glass, used in sidebar and toolbars
 *  - teal       → teal, the "Add Intervention" / submit form button
 *  - save-active   → green, Save Changes button when dirty edits exist
 *  - save-disabled → grey, Save Changes button when no pending edits
 *  - undo       → amber, "Undo Changes" button
 *  - danger     → red, destructive actions (delete, sign-out)
 *
 * @param {Object}   props
 * @param {string}   [props.variant]   - 'primary'|'secondary'|'teal'|'save-active'|'save-disabled'|'undo'|'danger'
 * @param {ReactNode}[props.icon]      - Icon element rendered before children
 * @param {ReactNode}[props.children]  - Button label
 * @param {boolean}  [props.loading]   - Shows a spinner and disables the button
 * @param {boolean}  [props.disabled]
 * @param {string}   [props.loadingText] - Overrides children while loading
 */
export const Button = ({
  variant = 'primary',
  icon,
  children,
  loading = false,
  loadingText,
  disabled,
  className,
  ...rest
}) => {
  const variantClass = styles[variant.replace('-', '_')] ?? styles.primary;
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      disabled={isDisabled}
      className={[styles.btn, variantClass, className].filter(Boolean).join(' ')}
      {...rest}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        icon && <span className={styles.iconWrap}>{icon}</span>
      )}
      {loading
        ? (loadingText ?? children)
        : children}
    </button>
  );
};

export default Button;
