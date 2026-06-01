import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { state } = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const userData = await login(username, password)
      // Senior and admin users go to the review queue, standard users go to questions
      const destination = userData.role === 'senior' || userData.role === 'admin'
        ? '/review'
        : '/'
      navigate(destination, { replace: true })
    } catch {
      setError('Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main>
      <h1>DevKnow</h1>
      <h2>Sign in</h2>
      {state?.successMessage && (
        <p role="status" className="alert alert--success">{state.successMessage}</p>
      )}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username" className="required">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="password" className="required">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p role="alert" className="alert alert--error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <p>
        No account? <Link to="/register">Create one</Link>
      </p>
    </main>
  )
}
