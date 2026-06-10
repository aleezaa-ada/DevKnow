import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import styles from './RegisterPage.module.css'

const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 30
const USERNAME_REGEX = /^[A-Za-z0-9_.-]+$/

export default function RegisterPage() {
  const navigate = useNavigate()
  const [fields, setFields] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    // Clear the error for this field as the user types
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }))
  }

  function validate() {
    const nextErrors = {}
    const username = fields.username.trim()

    if (username.length < USERNAME_MIN_LENGTH) {
      nextErrors.username = `Username must be at least ${USERNAME_MIN_LENGTH} characters.`
    } else if (username.length > USERNAME_MAX_LENGTH) {
      nextErrors.username = `Username must be at most ${USERNAME_MAX_LENGTH} characters.`
    } else if (!USERNAME_REGEX.test(username)) {
      nextErrors.username = 'Username can only contain letters, numbers, dots, underscores, and hyphens.'
    }

    if (fields.password !== fields.password2) {
      nextErrors.password2 = 'Passwords do not match'
    }

    return nextErrors
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const clientErrors = validate()
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }

    setErrors({})
    setLoading(true)

    const payload = {
      username: fields.username.trim(),
      email: fields.email.trim().toLowerCase(),
      password: fields.password,
      password2: fields.password2,
    }

    try {
      await api.post('/auth/register/', payload)
      navigate('/login', { state: { successMessage: 'Account created! Please sign in.' } })
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        // Map DRF field errors (e.g. { username: ['Already taken.'] }) onto state
        const mapped = {}
        for (const [key, val] of Object.entries(data)) {
          mapped[key] = Array.isArray(val) ? val[0] : val
        }
        setErrors(mapped)
      } else {
        setErrors({ non_field_errors: 'Registration failed. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.brand}>DevKnow</h1>
      <h2 className={styles.heading}>Create an account</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="username" className="required">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            value={fields.username}
            onChange={handleChange}
            minLength={USERNAME_MIN_LENGTH}
            maxLength={USERNAME_MAX_LENGTH}
            pattern="[A-Za-z0-9_.-]+"
            required
            autoFocus
          />
          {errors.username && <p role="alert">{errors.username}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="email" className="required">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={fields.email}
            onChange={handleChange}
            required
          />
          {errors.email && <p role="alert">{errors.email}</p>}
          <p className={styles.fieldHint}>Senior developers: use your pre-approved email to receive senior access automatically.</p>
        </div>

        <div className={styles.field}>
          <label htmlFor="password" className="required">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={fields.password}
            onChange={handleChange}
            required
          />
          {errors.password && <p role="alert">{errors.password}</p>}
        </div>

        <div className={styles.field}>
          <label htmlFor="password2" className="required">Confirm password</label>
          <input
            id="password2"
            name="password2"
            type="password"
            value={fields.password2}
            onChange={handleChange}
            required
          />
          {errors.password2 && <p role="alert">{errors.password2}</p>}
        </div>

        {errors.non_field_errors && (
          <p role="alert" className="alert alert--error">{errors.non_field_errors}</p>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className={styles.authSwitch}>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </main>
  )
}
