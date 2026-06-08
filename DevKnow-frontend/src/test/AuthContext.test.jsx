import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const postMock = vi.fn()
const getMock = vi.fn()

vi.mock('../api/client', () => ({
  default: {
    post: (...args) => postMock(...args),
    get: (...args) => getMock(...args),
  },
}))

import { AuthProvider, useAuth } from '../context/AuthContext'

function TestHarness() {
  const { user, login, logout } = useAuth()

  return (
    <div>
      <p data-testid="user">{user ? `${user.username}:${user.role}` : 'none'}</p>
      <button type="button" onClick={() => login('dev', 'pass123')}>
        login
      </button>
      <button type="button" onClick={logout}>logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear()
    postMock.mockReset()
    getMock.mockReset()
  })

  it('restores session from localStorage when token and valid user exist', () => {
    localStorage.setItem('access_token', 'token')
    localStorage.setItem('user', JSON.stringify({ id: 1, username: 'saved', role: 'standard' }))

    render(
      <AuthProvider>
        <TestHarness />
      </AuthProvider>
    )

    expect(screen.getByTestId('user')).toHaveTextContent('saved:standard')
  })

  it('drops invalid stored user JSON during restore', () => {
    localStorage.setItem('access_token', 'token')
    localStorage.setItem('user', '{bad-json')

    render(
      <AuthProvider>
        <TestHarness />
      </AuthProvider>
    )

    expect(screen.getByTestId('user')).toHaveTextContent('none')
    expect(localStorage.getItem('user')).toBeNull()
  })

  it('login stores tokens and user profile', async () => {
    postMock.mockResolvedValue({ data: { access: 'access-123', refresh: 'refresh-123' } })
    getMock.mockResolvedValue({ data: { id: 9, role: 'senior' } })

    render(
      <AuthProvider>
        <TestHarness />
      </AuthProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'login' }))

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('dev:senior')
    })

    expect(postMock).toHaveBeenCalledWith('/auth/login/', { username: 'dev', password: 'pass123' })
    expect(getMock).toHaveBeenCalledWith('/auth/me/')
    expect(localStorage.getItem('access_token')).toBe('access-123')
    expect(localStorage.getItem('refresh_token')).toBe('refresh-123')
    expect(localStorage.getItem('user')).toContain('"username":"dev"')
  })

  it('logout clears session and user state', async () => {
    localStorage.setItem('access_token', 'token')
    localStorage.setItem('refresh_token', 'refresh')
    localStorage.setItem('user', JSON.stringify({ id: 1, username: 'saved', role: 'standard' }))

    render(
      <AuthProvider>
        <TestHarness />
      </AuthProvider>
    )

    expect(screen.getByTestId('user')).toHaveTextContent('saved:standard')

    fireEvent.click(screen.getByRole('button', { name: 'logout' }))

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('none')
    })

    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })
})
