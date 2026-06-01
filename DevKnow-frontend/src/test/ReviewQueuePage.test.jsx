import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ReviewQueuePage from '../pages/ReviewQueuePage'

vi.mock('../api/client', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

import api from '../api/client'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const makeQuestion = (id, title = `Question ${id}`) => ({
  id,
  title,
  description: `Description for question ${id}`,
  author: { id: 10, username: 'alice', role: 'standard' },
  status: 'pending',
  tags: [{ id: 1, name: 'django' }],
  created_at: '2026-05-01T10:00:00Z',
  updated_at: '2026-05-01T10:00:00Z',
  ai_response: {
    id: id * 100,
    content: `AI draft content for question ${id}`,
    model_used: 'gpt-4o',
    approval_status: 'pending',
    generated_at: '2026-05-01T10:01:00Z',
  },
  approved_answer: null,
})

function renderPage() {
  return render(
    <MemoryRouter>
      <ReviewQueuePage />
    </MemoryRouter>
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ReviewQueuePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading indicator while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByText(/loading review queue/i)).toBeInTheDocument()
  })

  it('shows an error alert when the fetch fails', async () => {
    api.get.mockRejectedValue(new Error('Network Error'))
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Could not load the review queue. Please try again.')
    })
  })

  it('shows an empty state message when there are no pending questions', async () => {
    api.get.mockResolvedValue({ data: [] })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/all caught up/i)).toBeInTheDocument()
    })
  })

  it('renders the list of pending question titles', async () => {
    api.get.mockResolvedValue({ data: [makeQuestion(1, 'How does ORM work?'), makeQuestion(2, 'What is JWT?')] })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('How does ORM work?')).toBeInTheDocument()
      expect(screen.getByText('What is JWT?')).toBeInTheDocument()
    })
  })

  it('shows pending count in the subtitle', async () => {
    api.get.mockResolvedValue({ data: [makeQuestion(1), makeQuestion(2)] })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/2 questions awaiting review/i)).toBeInTheDocument()
    })
  })

  it('card is collapsed by default — description not visible', async () => {
    api.get.mockResolvedValue({ data: [makeQuestion(1)] })
    renderPage()
    await waitFor(() => screen.getByText('Question 1'))
    expect(screen.queryByText('Description for question 1')).not.toBeInTheDocument()
  })

  it('expands a card when the Expand button is clicked', async () => {
    api.get.mockResolvedValue({ data: [makeQuestion(1)] })
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /expand/i }))
    await userEvent.click(screen.getByRole('button', { name: /expand/i }))
    expect(screen.getByText('Description for question 1')).toBeInTheDocument()
    expect(screen.getByText('AI draft content for question 1')).toBeInTheDocument()
  })

  it('collapses a card when the Collapse button is clicked', async () => {
    api.get.mockResolvedValue({ data: [makeQuestion(1)] })
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /expand/i }))
    await userEvent.click(screen.getByRole('button', { name: /expand/i }))
    await userEvent.click(screen.getByRole('button', { name: /collapse/i }))
    expect(screen.queryByText('Description for question 1')).not.toBeInTheDocument()
  })

  it('submits an approve decision and removes the card from the list', async () => {
    api.get.mockResolvedValue({ data: [makeQuestion(1)] })
    api.post.mockResolvedValue({ data: { status: 'ok', action: 'approved' } })

    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /expand/i }))
    await userEvent.click(screen.getByRole('button', { name: /expand/i }))

    // 'Approve as-is' is the default selection — submit directly
    await userEvent.click(screen.getByRole('button', { name: /submit decision/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/questions/100/review/', {
        action: 'approved',
        review_notes: '',
      })
      expect(screen.queryByText('Question 1')).not.toBeInTheDocument()
    })
  })

  it('submits a reject decision and removes the card from the list', async () => {
    api.get.mockResolvedValue({ data: [makeQuestion(1)] })
    api.post.mockResolvedValue({ data: { status: 'ok', action: 'rejected' } })

    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /expand/i }))
    await userEvent.click(screen.getByRole('button', { name: /expand/i }))

    await userEvent.click(screen.getByRole('radio', { name: /reject/i }))
    await userEvent.click(screen.getByRole('button', { name: /submit decision/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/questions/100/review/', {
        action: 'rejected',
        review_notes: '',
      })
      expect(screen.queryByText('Question 1')).not.toBeInTheDocument()
    })
  })

  it('shows the edited content textarea when "Edit then approve" is selected', async () => {
    api.get.mockResolvedValue({ data: [makeQuestion(1)] })
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /expand/i }))
    await userEvent.click(screen.getByRole('button', { name: /expand/i }))

    await userEvent.click(screen.getByRole('radio', { name: /edit then approve/i }))

    expect(screen.getByLabelText(/edited answer/i)).toBeInTheDocument()
  })

  it('submits an edit decision with edited_content in the payload', async () => {
    api.get.mockResolvedValue({ data: [makeQuestion(1)] })
    api.post.mockResolvedValue({ data: { status: 'ok', action: 'edited' } })

    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /expand/i }))
    await userEvent.click(screen.getByRole('button', { name: /expand/i }))

    await userEvent.click(screen.getByRole('radio', { name: /edit then approve/i }))

    const editedTextarea = screen.getByLabelText(/edited answer/i)
    await userEvent.clear(editedTextarea)
    await userEvent.type(editedTextarea, 'Corrected answer content')

    await userEvent.click(screen.getByRole('button', { name: /submit decision/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/questions/100/review/', {
        action: 'edited',
        edited_content: 'Corrected answer content',
        review_notes: '',
      })
    })
  })

  it('shows a submit error and keeps the card visible when the POST fails', async () => {
    api.get.mockResolvedValue({ data: [makeQuestion(1)] })
    api.post.mockRejectedValue({ response: { data: { error: 'Permission denied' } } })

    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /expand/i }))
    await userEvent.click(screen.getByRole('button', { name: /expand/i }))
    await userEvent.click(screen.getByRole('button', { name: /submit decision/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Permission denied')
      expect(screen.getByText('Question 1')).toBeInTheDocument()
    })
  })

  it('disables the submit button while the POST is in flight', async () => {
    api.get.mockResolvedValue({ data: [makeQuestion(1)] })
    api.post.mockImplementation(() => new Promise(() => {}))

    renderPage()
    await waitFor(() => screen.getByRole('button', { name: /expand/i }))
    await userEvent.click(screen.getByRole('button', { name: /expand/i }))
    await userEvent.click(screen.getByRole('button', { name: /submit decision/i }))

    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled()
  })

  it('handles a paginated response ({ results: [] })', async () => {
    api.get.mockResolvedValue({ data: { count: 1, results: [makeQuestion(1)] } })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument()
    })
  })
})
