import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockState = vi.hoisted(() => {
  const requestUse = vi.fn()
  const responseUse = vi.fn()
  const axiosInstance = {
    interceptors: {
      request: { use: requestUse },
      response: { use: responseUse },
    },
  }
  return { requestUse, responseUse, axiosInstance }
})

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockState.axiosInstance),
  },
}))

import api from '../api/client'

describe('api client interceptors', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('attaches Authorization header when access token exists', () => {
    expect(api).toBeTruthy()
    const requestInterceptor = mockState.requestUse.mock.calls[0][0]

    localStorage.setItem('access_token', 'token-abc')
    const config = { headers: {} }
    const updated = requestInterceptor(config)

    expect(updated.headers.Authorization).toBe('Bearer token-abc')
  })

  it('does not attach Authorization header when token is missing', () => {
    const requestInterceptor = mockState.requestUse.mock.calls[0][0]

    const config = { headers: {} }
    const updated = requestInterceptor(config)

    expect(updated.headers.Authorization).toBeUndefined()
  })

  it('clears auth storage on 401 for non-login endpoints', async () => {
    const rejectInterceptor = mockState.responseUse.mock.calls[0][1]

    localStorage.setItem('access_token', 'x')
    localStorage.setItem('refresh_token', 'y')

    const error = {
      config: { url: '/questions/' },
      response: { status: 401 },
    }

    await expect(rejectInterceptor(error)).rejects.toBe(error)

    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
  })

  it('does not clear auth storage on 401 from login endpoint', async () => {
    const rejectInterceptor = mockState.responseUse.mock.calls[0][1]

    localStorage.setItem('access_token', 'x')
    localStorage.setItem('refresh_token', 'y')

    const error = {
      config: { url: '/auth/login/' },
      response: { status: 401 },
    }

    await expect(rejectInterceptor(error)).rejects.toBe(error)

    expect(localStorage.getItem('access_token')).toBe('x')
    expect(localStorage.getItem('refresh_token')).toBe('y')
  })
})
