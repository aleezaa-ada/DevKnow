import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import QuestionDetailPage from '../pages/QuestionDetailPage'
import { AuthContext } from '../context/AuthContext'

vi.mock('../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

import api from '../api/client'

// ── Shared fixtures ──────────────────────────────────────────────────────────

const mockQuestion = {
  id: 1,
  title: 'How does Django ORM work?',
  description: 'I want to understand the internals.',
  author: { id: 10, username: 'alice', role: 'standard' },
  status: 'pending',
  tags: [{ id: 1, name: 'django' }],
  created_at: '2026-05-01T10:00:00Z',
  updated_at: '2026-05-01T10:00:00Z',
  ai_response: {
    id: 1,
    content: 'Django ORM uses an active record pattern…',
    model_used: 'gpt-4o',
    approval_status: 'pending',
    generated_at: '2026-05-01T10:01:00Z',
  },
  approved_answer: null,
}

const mockQuestionAnswered = {
  ...mockQuestion,
  status: 'answered',
  ai_response: { id: 1, content: 'Django ORM uses an active record pattern…', model_used: 'gpt-4o', approval_status: 'approved', generated_at: '2026-05-01T10:01:00Z' },
  approved_answer: {
    id: 5,
    final_content: 'Django ORM is a database-abstraction API…',
    approved_by: { id: 20, username: 'bob', role: 'senior' },
    approved_at: '2026-05-02T10:00:00Z',
    vote_count: 3,
  },
}

// Visitor who is NOT the question author
const mockAuth = { user: { id: 99, username: 'visitor', role: 'standard' }, login: vi.fn(), logout: vi.fn() }
const seniorAuth = { user: { id: 99, username: 'reviewer', role: 'senior' }, login: vi.fn(), logout: vi.fn() }

// Helper: renders the page inside a Route so useParams gets the :id
function renderPage(auth = mockAuth) {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={['/questions/1']}>
        <Routes>
          <Route path="/questions/:id" element={<QuestionDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('QuestionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading indicator while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByText(/loading question/i)).toBeInTheDocument()
  })

  it('renders the question title and description after loading', async () => {
    api.get.mockResolvedValue({ data: mockQuestion })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('How does Django ORM work?')).toBeInTheDocument()
      expect(screen.getByText('I want to understand the internals.')).toBeInTheDocument()
    })
  })

  it('shows the AI draft block with disclaimer when ai_response is pending', async () => {
    api.get.mockResolvedValue({ data: mockQuestion })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/AI Draft Response/i)).toBeInTheDocument()
      expect(screen.getByText(/awaiting review by a senior developer/i)).toBeInTheDocument()
      expect(screen.getByText('Django ORM uses an active record pattern…')).toBeInTheDocument()
    })
  })

  it('does not show the AI draft block when there is no pending ai_response', async () => {
    api.get.mockResolvedValue({ data: mockQuestionAnswered })
    renderPage()
    await waitFor(() => {
      expect(screen.queryByText(/AI Draft Response/i)).not.toBeInTheDocument()
    })
  })

  it('shows the approved answer block with approver name and vote count', async () => {
    api.get.mockResolvedValue({ data: mockQuestionAnswered })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Approved Answer/i)).toBeInTheDocument()
      expect(screen.getByText(/bob/)).toBeInTheDocument()
      expect(screen.getByText(/Django ORM is a database-abstraction API/i)).toBeInTheDocument()
      expect(screen.getByText(/Score: 3/i)).toBeInTheDocument()
    })
  })

  it('hides vote buttons when the logged-in user is the question author', async () => {
    api.get.mockResolvedValue({ data: mockQuestionAnswered })
    // User id 10 matches author.id 10
    const authorAuth = { user: { id: 10, username: 'alice', role: 'standard' }, login: vi.fn(), logout: vi.fn() }
    renderPage(authorAuth)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /upvote/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /downvote/i })).not.toBeInTheDocument()
    })
  })

  it('calls POST with value 1 and refreshes count on upvote', async () => {
    api.get
      .mockResolvedValueOnce({ data: mockQuestionAnswered })  // initial load
      .mockResolvedValueOnce({                                // re-fetch after vote
        data: {
          ...mockQuestionAnswered,
          approved_answer: { ...mockQuestionAnswered.approved_answer, vote_count: 4 },
        },
      })
    api.post.mockResolvedValue({ data: { voted: 1, created: true } })

    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /upvote/i }))
    await userEvent.click(screen.getByRole('button', { name: /upvote/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/questions/answers/5/vote/', { value: 1 })
      expect(screen.getByText(/Score: 4/i)).toBeInTheDocument()
    })
  })

  it('calls POST with value -1 on downvote', async () => {
    api.get
      .mockResolvedValueOnce({ data: mockQuestionAnswered })
      .mockResolvedValueOnce({
        data: {
          ...mockQuestionAnswered,
          approved_answer: { ...mockQuestionAnswered.approved_answer, vote_count: 2 },
        },
      })
    api.post.mockResolvedValue({ data: { voted: -1, created: true } })

    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /downvote/i }))
    await userEvent.click(screen.getByRole('button', { name: /downvote/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/questions/answers/5/vote/', { value: -1 })
    })
  })

  it('shows a vote error when the vote API call fails', async () => {
    api.get.mockResolvedValue({ data: mockQuestionAnswered })
    api.post.mockRejectedValue({
      response: { data: { error: 'You cannot vote on your own question' } },
    })

    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /upvote/i }))
    await userEvent.click(screen.getByRole('button', { name: /upvote/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('You cannot vote on your own question')
    })
  })

  it('shows an error alert when the initial API fetch fails', async () => {
    api.get.mockRejectedValue(new Error('Network Error'))
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Could not load this question. Please try again.')
    })
  })

  it('shows a failure notice when no ai_response or approved_answer exists yet', async () => {
    api.get.mockResolvedValue({ data: { ...mockQuestion, ai_response: null, approved_answer: null } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/AI response could not be generated/i)).toBeInTheDocument()
    })
  })

  // ── Edit answer (senior/admin only) ────────────────────────────────────────

  it('shows Edit answer button for senior user viewing an approved answer', async () => {
    api.get.mockResolvedValue({ data: mockQuestionAnswered })
    renderPage(seniorAuth)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit answer/i })).toBeInTheDocument()
    })
  })

  it('does not show Edit answer button for a standard user', async () => {
    api.get.mockResolvedValue({ data: mockQuestionAnswered })
    renderPage(mockAuth)
    await waitFor(() => screen.getByText(/Approved Answer/i))
    expect(screen.queryByRole('button', { name: /edit answer/i })).not.toBeInTheDocument()
  })

  it('opens the edit form pre-filled with the current answer when Edit is clicked', async () => {
    api.get.mockResolvedValue({ data: mockQuestionAnswered })
    renderPage(seniorAuth)
    await waitFor(() => screen.getByRole('button', { name: /edit answer/i }))
    await userEvent.click(screen.getByRole('button', { name: /edit answer/i }))

    const textarea = screen.getByLabelText(/edited answer/i)
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveValue('Django ORM is a database-abstraction API…')
  })

  it('submits edit with correct payload and refreshes the answer', async () => {
    api.get
      .mockResolvedValueOnce({ data: mockQuestionAnswered })
      .mockResolvedValueOnce({
        data: {
          ...mockQuestionAnswered,
          approved_answer: { ...mockQuestionAnswered.approved_answer, final_content: 'Updated content' },
        },
      })
    api.post.mockResolvedValue({ data: { status: 'ok', action: 'edited' } })

    renderPage(seniorAuth)
    await waitFor(() => screen.getByRole('button', { name: /edit answer/i }))
    await userEvent.click(screen.getByRole('button', { name: /edit answer/i }))

    const textarea = screen.getByLabelText(/edited answer/i)
    await userEvent.clear(textarea)
    await userEvent.type(textarea, 'Updated content')
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/questions/1/review/', {
        action: 'edited',
        edited_content: 'Updated content',
        review_notes: '',
      })
      expect(screen.getByText('Updated content')).toBeInTheDocument()
    })
  })

  it('closes edit form and shows no save button after cancel', async () => {
    api.get.mockResolvedValue({ data: mockQuestionAnswered })
    renderPage(seniorAuth)
    await waitFor(() => screen.getByRole('button', { name: /edit answer/i }))
    await userEvent.click(screen.getByRole('button', { name: /edit answer/i }))
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.queryByLabelText(/edited answer/i)).not.toBeInTheDocument()
  })

  it('shows an error when the edit POST fails', async () => {
    api.get.mockResolvedValue({ data: mockQuestionAnswered })
    api.post.mockRejectedValue({ response: { data: { error: 'Permission denied' } } })

    renderPage(seniorAuth)
    await waitFor(() => screen.getByRole('button', { name: /edit answer/i }))
    await userEvent.click(screen.getByRole('button', { name: /edit answer/i }))
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Permission denied')
    })
  })
})
