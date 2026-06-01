import { Link } from 'react-router-dom'
import styles from './EmptyState.module.css'

/**
 * EmptyState — consistent placeholder for empty lists or zero-results screens.
 *
 * Props:
 *  icon       {string}  – emoji or short symbol (default: "📭")
 *  heading    {string}  – primary message
 *  body       {string}  – optional supporting text
 *  actionTo   {string}  – optional Link target (renders a CTA button)
 *  actionLabel{string}  – CTA label (default: "Get started")
 */
export default function EmptyState({
  icon = '📭',
  heading,
  body,
  actionTo,
  actionLabel = 'Get started',
}) {
  return (
    <div className={styles.wrapper}>
      <span className={styles.icon} aria-hidden="true">{icon}</span>
      {heading && <p className={styles.heading}>{heading}</p>}
      {body && <p className={styles.body}>{body}</p>}
      {actionTo && (
        <Link to={actionTo} className={styles.action}>
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
