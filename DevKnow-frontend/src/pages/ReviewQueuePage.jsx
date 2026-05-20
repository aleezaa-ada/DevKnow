import { useEffect, useState } from 'react'
import api from '../api/client'
import styles from './ReviewQueuePage.module.css'

// ── ReviewCard ────────────────────────────────────────────────────────────────
// Renders a single pending question with inline expand/collapse and review form.

function ReviewCard({ question, onReviewed }) {
  const [expanded, setExpanded] = useState(false)
  const [action, setAction] = useState('approved')
  const [editedContent, setEditedContent] = useState(question.ai_response?.content ?? '')
  const [reviewNotes, setReviewNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError(null)
    setSubmitting(true)

    const payload = { action, review_notes: reviewNotes }
    if (action === 'edited') payload.edited_content = editedContent

    try {
      await api.post(`/questions/${question.ai_response.id}/review/`, payload)
      // Remove this card from the parent list on success
      onReviewed(question.id)
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Submission failed. Please try again.'
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <li className={styles.card}>
      {/* Header — always visible */}
      <div className={styles.cardHeader}>
        <div>
          <span className={styles.cardTitle}>{question.title}</span>
          <span className={styles.cardMeta}>
            {' '}— asked by <strong>{question.author?.username}</strong>
            {question.tags?.length > 0 && ` · ${question.tags.map((t) => t.name).join(', ')}`}
          </span>
        </div>
        <button
          type="button"
          className={styles.toggleBtn}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? 'Collapse ▲' : 'Expand ▼'}
        </button>
      </div>

      {/* Expanded detail + review form */}
      {expanded && (
        <div className={styles.cardBody}>
          <section className={styles.section}>
            <h3 className={styles.sectionHeading}>Question</h3>
            <p className={styles.preWrap}>{question.description}</p>
          </section>

          <section className={`${styles.section} ${styles.aiDraft}`}>
            <h3 className={styles.sectionHeading}>AI Draft Response</h3>
            <p className={styles.aiDisclaimer}>
              ⚠ AI-generated — not yet verified. Review before approving.
            </p>
            <p className={styles.preWrap}>{question.ai_response?.content}</p>
            <p className={styles.aiModel}>Model: {question.ai_response?.model_used}</p>
          </section>

          <form onSubmit={handleSubmit} className={styles.reviewForm}>
            <h3 className={styles.sectionHeading}>Your Decision</h3>

            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>Action</legend>

              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name={`action-${question.id}`}
                  value="approved"
                  checked={action === 'approved'}
                  onChange={() => setAction('approved')}
                />
                Approve as-is
              </label>

              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name={`action-${question.id}`}
                  value="edited"
                  checked={action === 'edited'}
                  onChange={() => setAction('edited')}
                />
                Edit then approve
              </label>

              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name={`action-${question.id}`}
                  value="rejected"
                  checked={action === 'rejected'}
                  onChange={() => setAction('rejected')}
                />
                Reject
              </label>
            </fieldset>

            {action === 'edited' && (
              <div className={styles.field}>
                <label htmlFor={`edited-${question.id}`} className={styles.label}>
                  Edited answer
                </label>
                <textarea
                  id={`edited-${question.id}`}
                  className={styles.textarea}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={8}
                  required
                />
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor={`notes-${question.id}`} className={styles.label}>
                Review notes <span className={styles.optional}>(optional)</span>
              </label>
              <textarea
                id={`notes-${question.id}`}
                className={styles.textarea}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                placeholder="Internal notes visible to admins only…"
              />
            </div>

            {submitError && (
              <p role="alert" className={styles.submitError}>{submitError}</p>
            )}

            <button type="submit" disabled={submitting} className={styles.submitBtn}>
              {submitting ? 'Submitting…' : 'Submit decision'}
            </button>
          </form>
        </div>
      )}
    </li>
  )
}

// ── ReviewQueuePage ───────────────────────────────────────────────────────────

export default function ReviewQueuePage() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    api.get('/questions/review/')
      .then((res) => {
        if (!cancelled) setQuestions(res.data?.results ?? res.data)
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the review queue. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Remove a question from the list once it has been reviewed
  function handleReviewed(questionId) {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId))
  }

  if (loading) return <main className={styles.container}><p>Loading review queue…</p></main>

  if (error) {
    return (
      <main className={styles.container}>
        <p role="alert" className={styles.fetchError}>{error}</p>
      </main>
    )
  }

  return (
    <main className={styles.container}>
      <h1>Review Queue</h1>
      <p className={styles.subtitle}>
        {questions.length === 0
          ? 'No pending questions — all caught up.'
          : `${questions.length} question${questions.length !== 1 ? 's' : ''} awaiting review.`
        }
      </p>

      {questions.length > 0 && (
        <ul className={styles.list}>
          {questions.map((q) => (
            <ReviewCard key={q.id} question={q} onReviewed={handleReviewed} />
          ))}
        </ul>
      )}
    </main>
  )
}

