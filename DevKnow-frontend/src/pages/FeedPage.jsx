import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import Spinner from '../components/Spinner'
import EmptyState from '../components/EmptyState'

const STATUS_ICONS = { open: '🔵', pending_review: '🟡', answered: '🟢' }
const STATUS_LABELS = { open: 'Open', pending_review: 'Pending review', answered: 'Answered' }

function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      <span aria-hidden="true">{STATUS_ICONS[status] ?? ''}</span>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export default function FeedPage() {
  const { state } = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [questions, setQuestions] = useState([])
  const [count, setCount] = useState(0)
  const [nextPage, setNextPage] = useState(null)
  const [prevPage, setPrevPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const page = Number(searchParams.get('page') ?? '1')

  // Clear router state after first render so a page reload won't re-show the auth error
  useEffect(() => {
    if (state?.authError) {
      window.history.replaceState({}, '')
    }
  }, [state?.authError])

  useEffect(() => {
    let cancelled = false

    api.get('/questions/', { params: { page } })
      .then((res) => {
        if (!cancelled) {
          const payload = res.data
          // Keep compatibility with both paginated and plain array responses.
          if (Array.isArray(payload)) {
            setQuestions(payload)
            setCount(payload.length)
            setNextPage(null)
            setPrevPage(null)
          } else {
            setQuestions(payload?.results ?? [])
            setCount(payload?.count ?? 0)
            setNextPage(payload?.next ?? null)
            setPrevPage(payload?.previous ?? null)
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load questions. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [page])

  function goToPage(targetPage) {
    setLoading(true)
    setError(null)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (targetPage <= 1) {
        next.delete('page')
      } else {
        next.set('page', String(targetPage))
      }
      return next
    })
  }

  return (
    <main className="page" aria-busy={loading}>
      {state?.authError && (
        <p role="alert" className="alert alert--error">
          {state.authError}
        </p>
      )}

      <h1>Questions</h1>

      {loading && <Spinner label="Loading questions…" />}
      {error && <p role="alert" className="alert alert--error">{error}</p>}

      {!loading && !error && questions.length === 0 && (
        <EmptyState
          icon="💬"
          heading="No questions yet"
          body="Be the first to ask a question and get an AI-backed answer reviewed by a senior developer."
          actionTo="/ask"
          actionLabel="Ask the first question"
        />
      )}

      {!loading && !error && questions.length > 0 && (
        <>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {questions.map((q) => (
              <li key={q.id} style={{ borderBottom: '1px solid var(--border)', padding: '1rem 0' }}>
                <Link to={`/questions/${q.id}`} style={{ fontSize: '1.1rem', fontWeight: '500' }}>
                  {q.title}
                </Link>
                <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--text)', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span>by {q.author?.username}</span>
                  <StatusBadge status={q.status} />
                  <span>{new Date(q.created_at).toLocaleDateString()}</span>
                  {q.tags?.length > 0 && (
                    <span>{q.tags.map((t) => t.name).join(', ')}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button type="button" onClick={() => goToPage(page - 1)} disabled={!prevPage}>
              Previous
            </button>
            <span>Page {page}</span>
            <button type="button" onClick={() => goToPage(page + 1)} disabled={!nextPage}>
              Next
            </button>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #666)' }}>Total: {count}</span>
          </div>
        </>
      )}
    </main>
  )
}
