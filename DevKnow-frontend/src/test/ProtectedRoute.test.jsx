import { describe, it, expect } from 'vitest'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import ProtectedRoute from '../components/ProtectedRoute'
import { AuthContext } from '../context/AuthContext'

function renderWithUser(user, initialPath = '/review') {
  return render(
    <AuthContext.Provider value={{ user, login: async () => {}, logout: () => {} }}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/review"
            element={(
              <ProtectedRoute allowedRoles={['senior', 'admin']}>
                <h1>Review Dashboard</h1>
              </ProtectedRoute>
            )}
          />
          <Route path="/" element={<h1>Questions</h1>} />
          <Route path="/login" element={<h1>Sign in</h1>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

describe('ProtectedRoute', () => {
  it('redirects standard users away from review dashboard', () => {
    renderWithUser({ id: 1, username: 'dev', role: 'standard' })

    expect(screen.getByText('Questions')).toBeInTheDocument()
    expect(screen.queryByText('Review Dashboard')).not.toBeInTheDocument()
  })

  it('allows senior users to access review dashboard', () => {
    renderWithUser({ id: 2, username: 'senior', role: 'senior' })

    expect(screen.getByText('Review Dashboard')).toBeInTheDocument()
  })

  it('redirects unauthenticated users to login', () => {
    renderWithUser(null)

    expect(screen.getByText('Sign in')).toBeInTheDocument()
    expect(screen.queryByText('Review Dashboard')).not.toBeInTheDocument()
  })
})