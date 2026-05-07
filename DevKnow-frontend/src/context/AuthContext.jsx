import { createContext, useContext, useState, useCallback } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

function restoreSession() {
  const token = localStorage.getItem('access_token')
  const savedUser = localStorage.getItem('user')
  if (token && savedUser) {
    try {
      return JSON.parse(savedUser)
    } catch {
      localStorage.removeItem('user')
    }
  }
  return null
}

export function AuthProvider({ children }) {
  // Lazy initializer — reads localStorage once on first render, no effect needed
  const [user, setUser] = useState(restoreSession)

  const login = useCallback(async (username, password) => {
    const response = await api.post('/auth/login/', { username, password })
    const { access, refresh } = response.data

    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)

    // Decode the JWT payload to get basic user info
    const payload = JSON.parse(atob(access.split('.')[1]))
    const userData = { id: payload.user_id, username }
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)

    return userData
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
