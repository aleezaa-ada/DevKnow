import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SearchResultsPage from '../pages/SearchResultsPage'

vi.mock('../api/client', () => ({
  default: { get: vi.fn() },
}))

import api from '../api/client'

const mockResults = [
  {
    id: 1,
    title: 'How does Django ORM work?',
    author: { username: 'alice' },
    status: 'open',
    created_at: '2026-05-01T10:00:00Z',
    tags: [{ name: 'django' }],
  },
  {
    id: 2,
    title: 'What is JWT authentication?',
    author: { username: 'bob' },
    status: 'pending_review',
    created_at: '2026-05-02T10:00:00Z',
    tags: [],
  },
  {
    id: 3,
    title: 'How to set up React Router?',
    author: { username: 'carol' },
    status: 'answered',
    created_at: '2026-05-03T10:00:00Z',
    tags: [{ name: 'react' }],
  },
]

/**
 * Renders SearchResultsPage with the given URL search params.
 * Uses MemoryRouter so we control the initial URL.
 */
function renderSearchPage(search = '?q=django') {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/search', search }]}>
      <SearchResultsPage />
    </MemoryRouter>
  )
}

describe('SearchResultsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Loading state ──────────────────────────────────────────────────────────
  it('shows a loading indicator while the request is in flight', () => {
    api.get.mockImplementation(() => new Promise(() => {}))

    renderSearchPage('?q=django')

    expect(screen.getByText(/searching…/i)).toBeInTheDocument()
  })

  // ── Results rendered ───────────────────────────────────────────────────────
  it('renders a list of matching questions when the API returns results', async () => {
    api.get.mockResolvedValue({ data: mockResults })

    renderSearchPage('?q=django')

    await waitFor(() => {
      expect(screen.getByText('How does Django ORM work?')).toBeInTheDocument()
      expect(screen.getByText('What is JWT authentication?')).toBeInTheDocument()
      expect(screen.getByText('How to set up React Router?')).toBeInTheDocument()
    })
  })

  it('passes the q param to the API', async () => {
    api.get.mockResolvedValue({ data: [] })

    renderSearchPage('?q=react')

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/questions/search/',
        expect.objectContaining({ params: { q: 'react' } })
      )
    })
  })

  it('handles a paginated response ({ results: [] })', async () => {
    api.get.mockResolvedValue({ data: { count: 1, results: [mockResults[0]] } })

    renderSearchPage('?q=django')

    await waitFor(() => {
      expect(screen.getByText('How does Django ORM work?')).toBeInTheDocument()
    })
  })

  // ── Empty state ────────────────────────────────────────────────────────────
  it('shows empty state with "Ask this question" link when no results', async () => {
    api.get.mockResolvedValue({ data: [] })

    renderSearchPage('?q=unknownterm')

    await waitFor(() => {
      expect(screen.getByText(/no results for/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /ask this question/i })).toBeInTheDocument()
    })
  })

  it('"Ask this question" link points to /ask', async () => {
    api.get.mockResolvedValue({ data: [] })

    renderSearchPage('?q=unknownterm')

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /ask this question/i })
      expect(link).toHaveAttribute('href', '/ask')
    })
  })

  // ── No query ──────────────────────────────────────────────────────────────
  it('does not call the API and shows a prompt when there is no query', () => {
    renderSearchPage('')

    expect(api.get).not.toHaveBeenCalled()
    expect(screen.getByText(/search for a question/i)).toBeInTheDocument()
  })

  // ── Error state ────────────────────────────────────────────────────────────
  it('shows an error alert when the API call fails', async () => {
    api.get.mockRejectedValue(new Error('Network error'))

    renderSearchPage('?q=fail')

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/could not load search results/i)
    })
  })

  // ── Filter chips ──────────────────────────────────────────────────────────
  it('renders filter chips when results are present', async () => {
    api.get.mockResolvedValue({ data: mockResults })

    renderSearchPage('?q=django')

    await waitFor(() => {
      expect(screen.getByRole('group', { name: /filter by status/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^open$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /answered/i })).toBeInTheDocument()
    })
  })

  it('does not render filter chips when there are no results', async () => {
    api.get.mockResolvedValue({ data: [] })

    renderSearchPage('?q=empty')

    await waitFor(() => {
      expect(screen.queryByRole('group', { name: /filter by status/i })).not.toBeInTheDocument()
    })
  })

  it('filters results to only the selected status', async () => {
    api.get.mockResolvedValue({ data: mockResults })

    renderSearchPage('?q=django')

    await waitFor(() => {
      expect(screen.getByText('How does Django ORM work?')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /^open$/i }))

    // Only the "open" question should be visible
    expect(screen.getByText('How does Django ORM work?')).toBeInTheDocument()
    expect(screen.queryByText('What is JWT authentication?')).not.toBeInTheDocument()
    expect(screen.queryByText('How to set up React Router?')).not.toBeInTheDocument()
  })

  it('pressing "All" chip after filtering shows all results again', async () => {
    api.get.mockResolvedValue({ data: mockResults })

    renderSearchPage('?q=django')

    await waitFor(() => {
      expect(screen.getByText('What is JWT authentication?')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /^open$/i }))
    await userEvent.click(screen.getByRole('button', { name: /^all$/i }))

    expect(screen.getByText('What is JWT authentication?')).toBeInTheDocument()
    expect(screen.getByText('How to set up React Router?')).toBeInTheDocument()
  })

  // ── Heading reflects query ────────────────────────────────────────────────
  it('shows the search query in the page heading', async () => {
    api.get.mockResolvedValue({ data: [] })

    renderSearchPage('?q=hooks')

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('hooks')
    })
  })
})
