import { apiClient } from '../lib/api'
import type { AuthResponse, LoginPayload, User } from '../types/auth'

export const authService = {
  login: async (credentials: LoginPayload): Promise<AuthResponse> => {
    return apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  getCurrentUser: async (): Promise<User> => {
    return apiClient<User>('/auth/me')
  },
}
