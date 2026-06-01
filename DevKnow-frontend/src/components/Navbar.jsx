import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LogoutButton from './LogoutButton'

export default function Navbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  function handleSearch(e) {
    e.preventDefault()
    const q = searchQuery.trim()
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`)
      setSearchQuery('')
    }
  }

  return (
    <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.5rem', borderBottom: '1px solid #e0e0e0' }}>
      <Link to="/" style={{ fontWeight: 'bold', fontSize: '1.2rem', textDecoration: 'none' }}>
        DevKnow
      </Link>

      <form onSubmit={handleSearch} role="search" style={{ display: 'flex', gap: '0.4rem' }}>
        <input
          type="search"
          aria-label="Search questions"
          placeholder="Search questions…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '0.35rem 0.65rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem', width: '220px' }}
        />
        <button type="submit" style={{ padding: '0.35rem 0.75rem', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer', fontSize: '0.9rem' }}>
          Search
        </button>
      </form>

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
