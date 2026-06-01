import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'

export default function NotFoundPage() {
  return (
    <main className="page">
      <EmptyState
        icon="🔍"
        heading="404 — Page not found"
        body="The page you were looking for doesn't exist or has been moved."
        actionTo="/"
        actionLabel="Go to home"
      />
      <p style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '0.5rem' }}>
        Or <Link to="/login">sign in</Link> if you have an account.
      </p>
    </main>
  )
}

