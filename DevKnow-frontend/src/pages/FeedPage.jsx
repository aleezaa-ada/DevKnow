import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../api/client'

export default function FeedPage() {
  const { state } = useLocation()
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Clear router state after first render so a page reload won't re-show the auth error
  useEffect(() => {
    if (state?.authError) {
      window.history.replaceState({}, '')
    }
  }, [state?.authError])

  useEffect(() => {
    let cancelled = false

    api.get('/questions/')
      .then((res) => {
        if (!cancelled) {
          // Handle both paginated { results: [] } and plain array responses
          setQuestions(res.data?.results ?? res.data)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load questions. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  return (
    <main style={{ padding: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
      {state?.authError && (
        <p role="alert" style={{ color: 'red', marginBottom: '1rem' }}>
          {state.authError}
        </p>
      )}

      <h1>Questions</h1>

      {loading && <p>Loading questions…</p>}
      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && questions.length === 0 && (
        <p>No questions yet. <Link to="/ask">Ask the first one.</Link></p>
      )}

      {!loading && !error && questions.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {questions.map((q) => (
            <li key={q.id} style={{ borderBottom: '1px solid #e0e0e0', padding: '1rem 0' }}>
              <Link to={`/questions/${q.id}`} style={{ fontSize: '1.1rem', fontWeight: '500' }}>
                {q.title}
              </Link>
              <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#555', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <span>by {q.author?.username}</span>
                <span>{q.status}</span>
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
