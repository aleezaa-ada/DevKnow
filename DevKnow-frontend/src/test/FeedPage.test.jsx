import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FeedPage from '../pages/FeedPage'

// Mock the axios api client — must be at module level (hoisted by Vitest)
vi.mock('../api/client', () => ({
  default: { get: vi.fn() },
}))

// Import the mock AFTER vi.mock so we get the mocked version
import api from '../api/client'

function renderFeedPage({ locationState = null, initialPath = '/' } = {}) {
  const [pathname, query = ''] = initialPath.split('?')
  const entry = {
    pathname,
    search: query ? `?${query}` : '',
    state: locationState,
  }

  return render(
    <MemoryRouter initialEntries={[entry]}>
      <FeedPage />
    </MemoryRouter>
  )
}

describe('FeedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows a loading indicator while the request is in flight', () => {
    // Never resolves — simulates slow network
    api.get.mockImplementation(() => new Promise(() => {}))

    renderFeedPage()

    expect(screen.getByText(/loading questions/i)).toBeInTheDocument()
  })

  it('renders a list of questions when the API returns data', async () => {
    api.get.mockResolvedValue({
      data: {
        count: 2,
        next: null,
        previous: null,
        results: [
          { id: 1, title: 'How does Django ORM work?', author: { username: 'alice' }, status: 'open', created_at: '2026-05-01T10:00:00Z', tags: [] },
          { id: 2, title: 'What is JWT?', author: { username: 'bob' }, status: 'answered', created_at: '2026-05-02T10:00:00Z', tags: [{ name: 'auth' }] },
        ],
      },
    })

    renderFeedPage()

    await waitFor(() => {
      expect(screen.getByText('How does Django ORM work?')).toBeInTheDocument()
      expect(screen.getByText('What is JWT?')).toBeInTheDocument()
    })

    expect(api.get).toHaveBeenCalledWith('/questions/', { params: { page: 1 } })
  })

  it('handles a paginated response ({ results: [] })', async () => {
    api.get.mockResolvedValue({
      data: {
        count: 1,
        next: null,
        previous: null,
        results: [
          { id: 3, title: 'Paginated question', author: { username: 'carol' }, status: 'open', created_at: '2026-05-03T10:00:00Z', tags: [] },
        ],
      },
    })

    renderFeedPage()

    await waitFor(() => {
      expect(screen.getByText('Paginated question')).toBeInTheDocument()
    })
  })

  it('shows an empty state message when the API returns no questions', async () => {
    api.get.mockResolvedValue({ data: { count: 0, next: null, previous: null, results: [] } })

    renderFeedPage()

    await waitFor(() => {
      expect(screen.getByText(/no questions yet/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /ask the first question/i })).toBeInTheDocument()
    })
  })

  it('shows an error alert when the API call fails', async () => {
    api.get.mockRejectedValue(new Error('Network Error'))

    renderFeedPage()

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Could not load questions. Please try again.')
    })
  })

  it('displays the authError message when redirected from a protected route', async () => {
    api.get.mockResolvedValue({ data: { count: 0, next: null, previous: null, results: [] } })

    renderFeedPage({ locationState: { authError: "You don't have permission to access that page." } })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent("You don't have permission to access that page.")
    })
  })

  it('reads page from query params when fetching questions', async () => {
    api.get.mockResolvedValue({
      data: { count: 0, next: null, previous: null, results: [] },
    })

    renderFeedPage({ initialPath: '/?page=3' })

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/questions/', { params: { page: 3 } })
    })
  })
})
