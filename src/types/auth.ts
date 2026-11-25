export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
  timestamp: string
}

export interface User {
  id: number
  email: string
  fullName: string
  role: string
  organizationId: number
}

export interface Organization {
  id: number
  name: string
  slug: string
  baseCurrency?: string
  country?: string
}

export interface AuthResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
  user: User
  organization: Organization
}

export interface LoginPayload {
  email: string
  password: string
}
