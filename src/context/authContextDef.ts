import { createContext } from 'react'
import type { Organization, User, LoginPayload } from '../types/auth'

export interface AuthContextType {
  user: User | null
  organization: Organization | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginPayload) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)
