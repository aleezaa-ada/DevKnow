import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LogoutButton from './LogoutButton'
import styles from './Navbar.module.css'

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
    <nav className={styles.nav}>
      <Link to="/" className={styles.brand}>DevKnow</Link>

      <form onSubmit={handleSearch} role="search" className={styles.searchForm}>
        <input
          type="search"
          aria-label="Search questions"
          placeholder="Search questions…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
        <button type="button" onClick={handleSearch} className={styles.searchBtn}>
          Search
        </button>
      </form>

      <div className={styles.actions}>
        <Link to="/ask">Ask a Question</Link>

        {(user?.role === 'senior' || user?.role === 'admin') && (
          <Link to="/review">Review Queue</Link>
        )}

        <span className={styles.userBadge}>
          {user?.username} <span className={styles.userRole}>({user?.role})</span>
        </span>

        <LogoutButton />
      </div>
    </nav>
  )
}
