import { useState, useEffect, type ReactNode } from 'react'
import type { Organization, User, LoginPayload } from '../types/auth'
import { authService } from '../services/authService'
import { AuthContext } from './authContextDef'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('plaan_user')
    return saved ? JSON.parse(saved) : null
  })
  const [organization, setOrganization] = useState<Organization | null>(() => {
    const saved = localStorage.getItem('plaan_org')
    return saved ? JSON.parse(saved) : null
  })
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('plaan_token')
  )
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // Listen for session expiry from API client
  useEffect(() => {
    const handleAuthExpired = () => {
      setToken(null)
      setUser(null)
      setOrganization(null)
    }

    window.addEventListener('plaan_auth_expired', handleAuthExpired)
    return () => {
      window.removeEventListener('plaan_auth_expired', handleAuthExpired)
    }
  }, [])

  const login = async (credentials: LoginPayload) => {
    setIsLoading(true)
    try {
      const response = await authService.login(credentials)
      setToken(response.accessToken)
      setUser(response.user)
      setOrganization(response.organization)

      localStorage.setItem('plaan_token', response.accessToken)
      localStorage.setItem('plaan_user', JSON.stringify(response.user))
      localStorage.setItem('plaan_org', JSON.stringify(response.organization))
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setOrganization(null)
    localStorage.removeItem('plaan_token')
    localStorage.removeItem('plaan_user')
    localStorage.removeItem('plaan_org')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
