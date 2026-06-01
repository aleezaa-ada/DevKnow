import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import styles from './SearchResultsPage.module.css'

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'Pending Review', value: 'pending_review' },
  { label: 'Answered', value: 'answered' },
]

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''

  // fetchedQuery tracks which query the current results/error belong to.
  // loading is derived: we're loading whenever query is set but doesn't match fetchedQuery.
  const [fetchedQuery, setFetchedQuery] = useState(null)
  const [results, setResults] = useState([])
  const [fetchError, setFetchError] = useState(null)
  const [activeFilter, setActiveFilter] = useState('')

  // Derived state — no synchronous setState in effect body
  const loading = Boolean(query.trim() && fetchedQuery !== query)
  const error = fetchedQuery === query ? fetchError : null

  useEffect(() => {
    if (!query.trim()) return

    let cancelled = false

    api.get('/questions/search/', { params: { q: query } })
      .then((res) => {
        if (!cancelled) {
          setResults(res.data?.results ?? res.data)
          setFetchError(null)
          setFetchedQuery(query)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFetchError('Could not load search results. Please try again.')
          setFetchedQuery(query)
        }
      })

    return () => { cancelled = true }
  }, [query])

  const filtered = activeFilter
    ? results.filter((q) => q.status === activeFilter)
    : results

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>
        {query ? <>Results for <em>"{query}"</em></> : 'Search'}
      </h1>

      {/* Filter chips */}
      {!loading && !error && query.trim() && results.length > 0 && (
        <div className={styles.chips} role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              className={`${styles.chip} ${activeFilter === value ? styles.chipActive : ''}`}
              onClick={() => setActiveFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {loading && <p>Searching…</p>}
      {error && <p role="alert" className={styles.error}>{error}</p>}

      {/* No query entered */}
      {!loading && !error && !query.trim() && (
        <p>Enter a search term in the bar above.</p>
      )}

      {/* Query entered but no results */}
      {!loading && !error && query.trim() && results.length === 0 && (
        <div className={styles.empty}>
          <p>No questions found for <em>"{query}"</em>.</p>
          <Link to="/ask" className={styles.askLink}>Ask this question</Link>
        </div>
      )}

      {/* Results filtered to zero */}
      {!loading && !error && query.trim() && results.length > 0 && filtered.length === 0 && (
        <p>No <em>{activeFilter.replace('_', ' ')}</em> questions in these results.</p>
      )}

      {/* Results list */}
      {!loading && !error && query.trim() && filtered.length > 0 && (
        <ul className={styles.list}>
          {filtered.map((q) => (
            <li key={q.id} className={styles.item}>
              <Link to={`/questions/${q.id}`} className={styles.title}>
                {q.title}
              </Link>
              <div className={styles.meta}>
                <span>by {q.author?.username}</span>
                <span className={`${styles.status} ${styles[`status_${q.status}`]}`}>
                  {q.status.replace('_', ' ')}
                </span>
                <span>{new Date(q.created_at).toLocaleDateString()}</span>
                {q.tags?.length > 0 && (
                  <span>{q.tags.map((t) => t.name).join(', ')}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
