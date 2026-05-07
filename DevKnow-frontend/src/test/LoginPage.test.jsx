import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../pages/LoginPage'
import { AuthContext } from '../context/AuthContext'

// Must be module-level so the hoisted vi.mock factory can reference it
const mockNavigate = vi.fn()

// vi.mock is hoisted — must be at module level, not inside beforeEach
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

// Helper — renders LoginPage with a mocked AuthContext and router
function renderLoginPage(loginMock) {
  const mockAuth = { user: null, login: loginMock, logout: vi.fn() }
  return render(
    <AuthContext.Provider value={mockAuth}>
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('renders username, password fields and submit button', () => {
    renderLoginPage(vi.fn())
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('calls login() with entered credentials on submit', async () => {
    const loginMock = vi.fn().mockResolvedValue({ role: 'standard', id: 1, username: 'dev' })
    renderLoginPage(loginMock)

    await userEvent.type(screen.getByLabelText('Username'), 'dev')
    await userEvent.type(screen.getByLabelText('Password'), 'pass123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('dev', 'pass123')
    })
  })

  it('redirects standard user to / after login', async () => {
    const loginMock = vi.fn().mockResolvedValue({ role: 'standard', id: 1, username: 'dev' })
    renderLoginPage(loginMock)

    await userEvent.type(screen.getByLabelText('Username'), 'dev')
    await userEvent.type(screen.getByLabelText('Password'), 'pass123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('redirects senior user to /review after login', async () => {
    const loginMock = vi.fn().mockResolvedValue({ role: 'senior', id: 2, username: 'senior' })
    renderLoginPage(loginMock)

    await userEvent.type(screen.getByLabelText('Username'), 'senior')
    await userEvent.type(screen.getByLabelText('Password'), 'pass123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/review', { replace: true })
    })
  })

  it('shows error message on failed login', async () => {
    const loginMock = vi.fn().mockRejectedValue(new Error('401'))
    renderLoginPage(loginMock)

    await userEvent.type(screen.getByLabelText('Username'), 'dev')
    await userEvent.type(screen.getByLabelText('Password'), 'wrongpassword')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid username or password.')
    })
  })

  it('disables submit button while loading', async () => {
    // login never resolves — simulates slow network
    const loginMock = vi.fn().mockImplementation(() => new Promise(() => {}))
    renderLoginPage(loginMock)

    await userEvent.type(screen.getByLabelText('Username'), 'dev')
    await userEvent.type(screen.getByLabelText('Password'), 'pass123')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
  })
})
