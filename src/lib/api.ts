const API_BASE_URL = '/api/v1'

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('plaan_token')

  const headers = new Headers(options.headers || {})
  headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'application/json')

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })
  } catch {
    throw new Error('Unable to connect to the server. Please try again shortly.')
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401) {
      // Clear expired or invalidated session
      localStorage.removeItem('plaan_token')
      localStorage.removeItem('plaan_user')
      localStorage.removeItem('plaan_org')
      window.dispatchEvent(new Event('plaan_auth_expired'))
      throw new Error(payload?.message || 'Invalid email or password.')
    }
    if (response.status === 403) {
      throw new Error('Access denied. You do not have permission to perform this action.')
    }
    if (response.status === 404) {
      throw new Error('The requested resource could not be found.')
    }
    if (response.status === 429) {
      throw new Error('Too many requests. Please wait a moment and try again.')
    }
    if (response.status >= 500) {
      throw new Error('Service is temporarily unavailable. Please try again later.')
    }

    const safeMessage =
      typeof payload?.message === 'string'
        ? payload.message
        : 'Unable to process your request. Please try again.'

    throw new Error(safeMessage)
  }

  return payload?.data ?? payload
}
