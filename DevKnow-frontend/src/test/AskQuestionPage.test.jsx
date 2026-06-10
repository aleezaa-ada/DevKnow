import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AskQuestionPage from '../pages/AskQuestionPage'

vi.mock('../api/client', () => ({
  default: { post: vi.fn() },
}))

import api from '../api/client'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/ask']}>
      <AskQuestionPage />
    </MemoryRouter>
  )
}

describe('AskQuestionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    localStorage.clear()
    localStorage.setItem('user', JSON.stringify({ id: 1, username: 'asker', role: 'standard' }))
  })

  it('renders title, description, tags fields and submit button', () => {
    renderPage()

    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/tags/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /submit question/i })).toBeInTheDocument()
  })

  it('shows a client-side error if title is too short', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText('Title'), 'Hi')
    await userEvent.type(screen.getByLabelText(/description/i), 'This is a long enough description.')
    await userEvent.click(screen.getByRole('button', { name: /submit question/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Title must be at least 5 characters.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('shows a client-side error if description is too short', async () => {
    renderPage()

    await userEvent.type(screen.getByLabelText('Title'), 'A valid title')
    await userEvent.type(screen.getByLabelText(/description/i), 'Short')
    await userEvent.click(screen.getByRole('button', { name: /submit question/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Description must be at least 10 characters.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('calls POST /questions/ with correct payload including parsed tags', async () => {
    api.post.mockResolvedValue({ data: { id: 42, title: 'A valid title' } })
    renderPage()

    await userEvent.type(screen.getByLabelText('Title'), 'A valid title here')
    await userEvent.type(screen.getByLabelText(/description/i), 'This description is definitely long enough.')
    await userEvent.type(screen.getByLabelText(/tags/i), 'django, orm, performance')
    await userEvent.click(screen.getByRole('button', { name: /submit question/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/questions/', {
        title: 'A valid title here',
        description: 'This description is definitely long enough.',
        tag_names: ['django', 'orm', 'performance'],
      })
    })
  })

  it('navigates to /questions/:id after successful submission', async () => {
    api.post.mockResolvedValue({ data: { id: 42 } })
    renderPage()

    await userEvent.type(screen.getByLabelText('Title'), 'A valid title here')
    await userEvent.type(screen.getByLabelText(/description/i), 'This description is definitely long enough.')
    await userEvent.click(screen.getByRole('button', { name: /submit question/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/questions/42')
    })
  })

  it('shows a field-level error from the API response', async () => {
    api.post.mockRejectedValue({
      response: { data: { title: ['Ensure this field has at least 5 characters.'] } },
    })
    renderPage()

    await userEvent.type(screen.getByLabelText('Title'), 'A valid title here')
    await userEvent.type(screen.getByLabelText(/description/i), 'This description is definitely long enough.')
    await userEvent.click(screen.getByRole('button', { name: /submit question/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Ensure this field has at least 5 characters.')
    })
  })

  it('shows a generic error when the API fails without field errors', async () => {
    api.post.mockRejectedValue({ response: null })
    renderPage()

    await userEvent.type(screen.getByLabelText('Title'), 'A valid title here')
    await userEvent.type(screen.getByLabelText(/description/i), 'This description is definitely long enough.')
    await userEvent.click(screen.getByRole('button', { name: /submit question/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    })
  })

  it('disables the submit button and shows loading text while the request is in flight', async () => {
    api.post.mockImplementation(() => new Promise(() => {}))
    renderPage()

    await userEvent.type(screen.getByLabelText('Title'), 'A valid title here')
    await userEvent.type(screen.getByLabelText(/description/i), 'This description is definitely long enough.')
    await userEvent.click(screen.getByRole('button', { name: /submit question/i }))

    const btn = screen.getByRole('button')
    expect(btn).toBeDisabled()
    expect(btn).toHaveTextContent(/submitting/i)
  })

  it('does not navigate when a late success response resolves after unmount', async () => {
    let resolvePost
    api.post.mockImplementation(() => new Promise((resolve) => {
      resolvePost = resolve
    }))

    const { unmount } = renderPage()

    await userEvent.type(screen.getByLabelText('Title'), 'A valid title here')
    await userEvent.type(screen.getByLabelText(/description/i), 'This description is definitely long enough.')
    await userEvent.click(screen.getByRole('button', { name: /submit question/i }))

    unmount()
    resolvePost({ data: { id: 777 } })
    await Promise.resolve()

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('does not navigate if logged-in user changes before submit resolves', async () => {
    let resolvePost
    api.post.mockImplementation(() => new Promise((resolve) => {
      resolvePost = resolve
    }))

    renderPage()

    await userEvent.type(screen.getByLabelText('Title'), 'A valid title here')
    await userEvent.type(screen.getByLabelText(/description/i), 'This description is definitely long enough.')
    await userEvent.click(screen.getByRole('button', { name: /submit question/i }))

    localStorage.setItem('user', JSON.stringify({ id: 2, username: 'other', role: 'senior' }))
    resolvePost({ data: { id: 900 } })
    await Promise.resolve()

    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
