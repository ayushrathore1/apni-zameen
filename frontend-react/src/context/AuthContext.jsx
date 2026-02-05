import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '@/services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const userData = await api.get('/auth/me')
        setUser(userData)
      } catch (err) {
        // Token invalid, clear it
        localStorage.removeItem('auth_token')
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email, password) => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await api.post('/auth/login', { email, password })
      const { access_token, user: userData } = response
      
      localStorage.setItem('auth_token', access_token)
      setUser(userData)
      
      return { success: true }
    } catch (err) {
      const message = err.data?.detail || err.message || 'Login failed'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
  }

  const value = {
    user,
    isAuthenticated: !!user,
    isOfficial: user?.role === 'OFFICIAL' || user?.role === 'ADMIN',
    isAdmin: user?.role === 'ADMIN',
    isLoading,
    error,
    login,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
