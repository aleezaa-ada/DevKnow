import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import styles from './QuestionDetailPage.module.css'
import Spinner from '../components/Spinner'
import MarkdownContent from '../components/MarkdownContent'

export default function QuestionDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [question, setQuestion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [voteCount, setVoteCount] = useState(null)
  const [voteError, setVoteError] = useState(null)
  const [voting, setVoting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState(null)

  useEffect(() => {
    let cancelled = false
    api.get(`/questions/${id}/`)
      .then((res) => {
        if (!cancelled) {
          setQuestion(res.data)
          setVoteCount(res.data.approved_answer?.vote_count ?? null)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this question. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  async function handleVote(value) {
    if (voting) return
    setVoteError(null)
    setVoting(true)
    try {
      await api.post(`/questions/answers/${question.approved_answer.id}/vote/`, { value })
      // Re-fetch to get the accurate updated score (backend uses update_or_create, not additive)
      const res = await api.get(`/questions/${id}/`)
      setVoteCount(res.data.approved_answer?.vote_count ?? 0)
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not submit vote. Please try again.'
      setVoteError(msg)
    } finally {
      setVoting(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this question? This cannot be undone.')) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.delete(`/questions/${id}/`)
      navigate('/', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Could not delete question. Please try again.'
      setDeleteError(msg)
      setDeleting(false)
    }
  }

  async function handleRetry() {
    setRetrying(true)
    setRetryError(null)
    try {
      await api.post(`/questions/${id}/retry-ai/`)
      const res = await api.get(`/questions/${id}/`)
      setQuestion(res.data)
      setVoteCount(res.data.approved_answer?.vote_count ?? null)
    } catch (err) {
      const msg = err.response?.data?.error || 'Could not reach AI. Please try again later.'
      setRetryError(msg)
    } finally {
      setRetrying(false)
    }
  }

  if (loading) {
    return <main className={styles.containerCentered}><Spinner label="Loading question…" /></main>
  }

  if (error) {
    return (
      <main className={styles.containerCentered}>
        <p role="alert" className={styles.fetchError}>{error}</p>
      </main>
    )
  }

  if (!question) return null

  const { ai_response, approved_answer } = question
  const isOwnQuestion = user?.id === question.author?.id
  const canEdit = user?.role === 'senior' || user?.role === 'admin'

  function handleStartEdit() {
    setEditContent(approved_answer.final_content)
    setEditNotes('')
    setEditError(null)
    setEditing(true)
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    setEditError(null)
    setEditSubmitting(true)
    try {
      await api.post(`/questions/${ai_response.id}/review/`, {
        action: 'edited',
        edited_content: editContent,
        review_notes: editNotes,
      })
      // Re-fetch to show the updated answer
      const res = await api.get(`/questions/${id}/`)
      setQuestion(res.data)
      setVoteCount(res.data.approved_answer?.vote_count ?? null)
      setEditing(false)
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Could not save changes. Please try again.'
      setEditError(msg)
    } finally {
      setEditSubmitting(false)
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.topBar}>
        <Link to="/">← Back to questions</Link>
        {isOwnQuestion && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className={styles.deleteBtn}
          >
            {deleting ? 'Deleting…' : 'Delete question'}
          </button>
        )}
      </div>

      {deleteError && <p role="alert" className={styles.voteError}>{deleteError}</p>}

      <h1 className={styles.title}>{question.title}</h1>

      <p className={styles.meta}>
        Asked by <strong>{question.author?.username}</strong>
        {question.tags?.length > 0 && ` · ${question.tags.map((t) => t.name).join(', ')}`}
        {' · '}{new Date(question.created_at).toLocaleDateString()}
      </p>

      <p className={styles.body}>{question.description}</p>

      {/* AI Draft block — only shown while the response is awaiting senior review */}
      {ai_response?.approval_status === 'pending' && (
        <div className={`${styles.answerBlock} ${styles.aiDraft}`}>
          <h2>AI Draft Response</h2>
          <p className={styles.aiDisclaimer}>
            ⚠ This is an AI-generated draft awaiting review by a senior developer. It has not been verified.
          </p>
          <MarkdownContent content={ai_response.content} className={styles.body} />
          <p className={styles.aiModel}>Generated by {ai_response.model_used}</p>
        </div>
      )}

      {/* Approved Answer block */}
      {approved_answer && (
        <div className={`${styles.answerBlock} ${styles.approved}`}>
          <h2>✓ Approved Answer</h2>
          <p className={styles.answerMeta}>
            Reviewed and approved by <strong>{approved_answer.approved_by?.username}</strong>
            {' on '}{new Date(approved_answer.approved_at).toLocaleDateString()}
          </p>
          <MarkdownContent content={approved_answer.final_content} className={styles.body} />

          <div className={styles.voteRow}>
            <span><strong>Score: {voteCount}</strong></span>
            {!isOwnQuestion && (
              <>
                <button onClick={() => handleVote(1)} disabled={voting} type="button">▲ Upvote</button>
                <button onClick={() => handleVote(-1)} disabled={voting} type="button">▼ Downvote</button>
              </>
            )}
            {canEdit && !editing && (
              <button onClick={handleStartEdit} type="button" className={styles.editBtn}>
                ✏ Edit answer
              </button>
            )}
          </div>

          {voteError && (
            <p role="alert" className={styles.voteError}>{voteError}</p>
          )}

          {editing && (
            <form onSubmit={handleEditSubmit} className={styles.editForm}>
              <div className={styles.editField}>
                <label htmlFor="edit-content" className={styles.editLabel}>Edited answer</label>
                <textarea
                  id="edit-content"
                  className={styles.editTextarea}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={8}
                  required
                />
              </div>
              <div className={styles.editField}>
                <label htmlFor="edit-notes" className={styles.editLabel}>
                  Review notes <span className={styles.editOptional}>(optional)</span>
                </label>
                <textarea
                  id="edit-notes"
                  className={styles.editTextarea}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Internal notes visible to admins only…"
                />
              </div>
              {editError && <p role="alert" className={styles.voteError}>{editError}</p>}
              <div className={styles.editActions}>
                <button type="submit" disabled={editSubmitting} className={styles.editSaveBtn}>
                  {editSubmitting ? 'Saving…' : 'Save changes'}
                </button>
                <button type="button" onClick={() => setEditing(false)} disabled={editSubmitting} className={styles.editCancelBtn}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Rejected AI response notice */}
      {ai_response?.approval_status === 'rejected' && !approved_answer && (
        <div className={styles.rejectedNotice}>
          <p>✗ The AI-generated response for this question was rejected by a senior developer and will not be published.</p>
          {isOwnQuestion && (
            <div className={styles.retryRow}>
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                className={styles.retryBtn}
              >
                {retrying ? 'Retrying…' : '↻ Request a new AI response'}
              </button>
              {retryError && <p role="alert" className={styles.voteError}>{retryError}</p>}
            </div>
          )}
        </div>
      )}

      {/* No AI response — generation failed at question creation time */}
      {!ai_response && !approved_answer && (
        <div className={styles.aiFailureNotice}>
          <p>✗ AI response could not be generated. This question is still awaiting a response.</p>
          {isOwnQuestion && (
            <div className={styles.retryRow}>
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                className={styles.retryBtn}
              >
                {retrying ? 'Retrying…' : '↻ Retry AI generation'}
              </button>
              {retryError && <p role="alert" className={styles.voteError}>{retryError}</p>}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
