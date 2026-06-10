import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

// Minimum lengths mirror the backend RegisterSerializer constraints
const MIN_TITLE_LENGTH = 5
const MIN_DESC_LENGTH = 10

function getCurrentUserId() {
  const rawUser = localStorage.getItem('user')
  if (!rawUser) return null

  try {
    const parsed = JSON.parse(rawUser)
    return parsed?.id ?? null
  } catch {
    return null
  }
}

export default function AskQuestionPage() {
  const navigate = useNavigate()
  const isMountedRef = useRef(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tagsInput, setTagsInput] = useState('')   // comma-separated string
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Client-side validation - returns error map, empty object means valid
  function validate() {
    const errs = {}
    if (title.trim().length < MIN_TITLE_LENGTH) {
      errs.title = `Title must be at least ${MIN_TITLE_LENGTH} characters.`
    }
    if (description.trim().length < MIN_DESC_LENGTH) {
      errs.description = `Description must be at least ${MIN_DESC_LENGTH} characters.`
    }
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitError(null)
    const submitterUserId = getCurrentUserId()

    const clientErrors = validate()
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setErrors({})
    setLoading(true)

    // Convert comma-separated tag string to trimmed, lowercase array
    const tag_names = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)

    try {
      const res = await api.post('/questions/', { title: title.trim(), description: description.trim(), tag_names })
      if (!isMountedRef.current) return
      if (submitterUserId === null || getCurrentUserId() !== submitterUserId) return
      navigate(`/questions/${res.data.id}`)
    } catch (err) {
      if (!isMountedRef.current) return
      const data = err.response?.data
      if (data && typeof data === 'object') {
        // Map DRF field errors back to individual fields
        const mapped = {}
        for (const [key, val] of Object.entries(data)) {
          mapped[key] = Array.isArray(val) ? val[0] : val
        }
        setErrors(mapped)
      } else {
        setSubmitError('Something went wrong. Please try again.')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  return (
    <main className="page">
      <h1>Ask a Question</h1>
      <p>Describe your question clearly. An AI response will be generated and reviewed by a senior developer before being published.</p>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title" className="required">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: undefined })) }}
            placeholder="e.g. How does Django's ORM handle N+1 queries?"
            required
            autoFocus
          />
          {errors.title && <p role="alert">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="description" className="required">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => { setDescription(e.target.value); setErrors((p) => ({ ...p, description: undefined })) }}
            placeholder="Provide as much detail as possible…"
            rows={6}
            required
          />
          {errors.description && <p role="alert">{errors.description}</p>}
        </div>

        <div>
          <label htmlFor="tags">Tags <span style={{ fontWeight: 'normal', color: '#888' }}>(optional, comma-separated)</span></label>
          <input
            id="tags"
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. django, orm, performance"
          />
        </div>

        {submitError && <p role="alert" className="alert alert--error">{submitError}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Submitting… AI is generating a response, this may take a moment.' : 'Submit question'}
        </button>
      </form>
    </main>
  )
}
