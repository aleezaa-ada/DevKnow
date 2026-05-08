import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LogoutButton from './LogoutButton'

export default function Navbar() {
  const { user } = useAuth()

  return (
    <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
      <Link to="/" style={{ fontWeight: 'bold', fontSize: '1.2rem', textDecoration: 'none' }}>
        DevKnow
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/ask">Ask a Question</Link>

        {(user?.role === 'senior' || user?.role === 'admin') && (
          <Link to="/review">Review Queue</Link>
        )}

        <span style={{ color: '#555' }}>
          {user?.username} <span style={{ fontSize: '0.8rem', color: '#888' }}>({user?.role})</span>
        </span>

        <LogoutButton />
      </div>
    </nav>
  )
}
