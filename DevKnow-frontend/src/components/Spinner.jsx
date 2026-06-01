import styles from './Spinner.module.css'

/**
 * Spinner — animated loading indicator.
 *
 * Props:
 *  label  {string}  – screen-reader text (default: "Loading…")
 *  small  {boolean} – compact variant for inline use
 */
export default function Spinner({ label = 'Loading…', small = false }) {
  return (
    <div className={styles.wrapper} role="status" aria-live="polite">
      <div className={`${styles.ring}${small ? ` ${styles['ring--sm']}` : ''}`} />
      <span>{label}</span>
    </div>
  )
}
