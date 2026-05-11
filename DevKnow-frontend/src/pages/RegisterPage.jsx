import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [fields, setFields] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    role: 'standard',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  function handleChange(e) {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    // Clear the error for this field as the user types
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrors({})
    setLoading(true)

    try {
      await api.post('/auth/register/', fields)
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
    <main>
      <h1>DevKnow</h1>
      <h2>Create an account</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            type="text"
            value={fields.username}
            onChange={handleChange}
            required
            autoFocus
          />
          {errors.username && <p role="alert">{errors.username}</p>}
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={fields.email}
            onChange={handleChange}
            required
          />
          {errors.email && <p role="alert">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="role">I am joining as</label>
          <select
            id="role"
            name="role"
            value={fields.role}
            onChange={handleChange}
          >
            <option value="standard">Standard Developer</option>
            <option value="senior">Senior Developer</option>
          </select>
          {errors.role && <p role="alert">{errors.role}</p>}
        </div>

        <div>
          <label htmlFor="password">Password</label>
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

        <div>
          <label htmlFor="password2">Confirm password</label>
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
          <p role="alert">{errors.non_field_errors}</p>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </main>
  )
}
