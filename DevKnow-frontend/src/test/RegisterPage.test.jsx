import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RegisterPage from '../pages/RegisterPage'

// Mock the axios api client
vi.mock('../api/client', () => ({
  default: { post: vi.fn() },
}))

import api from '../api/client'

// Must be module-level for the hoisted vi.mock factory to reference it
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderRegisterPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <RegisterPage />
    </MemoryRouter>
  )
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  it('renders all form fields and submit button', () => {
    renderRegisterPage()

    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('renders a link to the login page', () => {
    renderRegisterPage()

    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
  })

  it('submits the form with all field values', async () => {
    api.post.mockResolvedValue({ data: { message: 'User created successfully' } })
    renderRegisterPage()

    await userEvent.type(screen.getByLabelText('Username'), 'newuser')
    await userEvent.type(screen.getByLabelText('Email'), 'new@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'securepass1')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'securepass1')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register/', {
        username: 'newuser',
        email: 'new@example.com',
        password: 'securepass1',
        password2: 'securepass1',
      })
    })
  })

  it('redirects to /login with a success message after registration', async () => {
    api.post.mockResolvedValue({ data: { message: 'User created successfully' } })
    renderRegisterPage()

    await userEvent.type(screen.getByLabelText('Username'), 'newuser')
    await userEvent.type(screen.getByLabelText('Email'), 'new@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'securepass1')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'securepass1')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: { successMessage: 'Account created! Please sign in.' },
      })
    })
  })

  it('shows a field-level error when the username is already taken', async () => {
    api.post.mockRejectedValue({
      response: { data: { username: ['A user with this username already exists.'] } },
    })
    renderRegisterPage()

    await userEvent.type(screen.getByLabelText('Username'), 'taken')
    await userEvent.type(screen.getByLabelText('Email'), 'taken@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'securepass1')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'securepass1')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('A user with this username already exists.')
    })
  })

  it('shows a client-side error for usernames shorter than 3 characters', async () => {
    renderRegisterPage()

    await userEvent.type(screen.getByLabelText('Username'), 'ab')
    await userEvent.type(screen.getByLabelText('Email'), 'short@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'securepass1')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'securepass1')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(screen.getByRole('alert')).toHaveTextContent('Username must be at least 3 characters.')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('shows a generic error when the API fails without field errors', async () => {
    api.post.mockRejectedValue({ response: null })
    renderRegisterPage()

    await userEvent.type(screen.getByLabelText('Username'), 'newuser')
    await userEvent.type(screen.getByLabelText('Email'), 'new@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'securepass1')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'securepass1')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Registration failed. Please try again.')
    })
  })

  it('disables the submit button while the request is in flight', async () => {
    api.post.mockImplementation(() => new Promise(() => {}))
    renderRegisterPage()

    await userEvent.type(screen.getByLabelText('Username'), 'newuser')
    await userEvent.type(screen.getByLabelText('Email'), 'new@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'securepass1')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'securepass1')
    await userEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled()
  })
})
