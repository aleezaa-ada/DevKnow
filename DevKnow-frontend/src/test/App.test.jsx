import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockUseAuth = vi.fn()

vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('../components/Navbar', () => ({
  default: () => <nav>Navbar</nav>,
}))

vi.mock('../components/ProtectedRoute', () => ({
  default: ({ children }) => <>{children}</>,
}))

vi.mock('../pages/LoginPage', () => ({
  default: () => <div>Login</div>,
}))
vi.mock('../pages/RegisterPage', () => ({
  default: () => <div>Register</div>,
}))
vi.mock('../pages/FeedPage', () => ({
  default: () => <div>Feed</div>,
}))
vi.mock('../pages/QuestionDetailPage', () => ({
  default: () => <div>Question detail</div>,
}))
vi.mock('../pages/AskQuestionPage', () => ({
  default: () => <div>Ask</div>,
}))
vi.mock('../pages/ReviewQueuePage', () => ({
  default: () => <div>Review queue</div>,
}))
vi.mock('../pages/ReviewDetailPage', () => ({
  default: () => <div>Review detail</div>,
}))
vi.mock('../pages/SearchResultsPage', () => ({
  default: () => <div>Search</div>,
}))
vi.mock('../pages/NotFoundPage', () => ({
  default: () => <div>Not found</div>,
}))

import App from '../App'

describe('App terms modal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('shows the terms modal for a logged-in user who has not accepted yet', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 42, username: 'dev1', role: 'standard' },
    })

    render(<App />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Before you continue')).toBeInTheDocument()
  })

  it('hides the terms modal when the user already accepted terms', () => {
    localStorage.setItem('devknow_terms_accepted_42', '1')
    mockUseAuth.mockReturnValue({
      user: { id: 42, username: 'dev1', role: 'standard' },
    })

    render(<App />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('requires explicit agreement before allowing continue', async () => {
    const user = userEvent.setup()
    mockUseAuth.mockReturnValue({
      user: { id: 7, username: 'dev2', role: 'standard' },
    })

    render(<App />)

    const continueButton = screen.getByRole('button', { name: 'Continue to DevKnow' })
    expect(continueButton).toBeDisabled()

    await user.click(screen.getByLabelText('I have read and agree to these terms'))
    expect(continueButton).toBeEnabled()

    await user.click(continueButton)

    expect(localStorage.getItem('devknow_terms_accepted_7')).toBe('1')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
