/**
 * API Configuration for Admin Panel
 */

const getBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
}

export const API_CONFIG = {
  get BASE_URL() {
    return getBaseUrl()
  },
  TIMEOUT: 30000,
} as const

export const getApiUrl = (endpoint: string): string => {
  const baseUrl = API_CONFIG.BASE_URL.replace(/\/$/, '')
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${baseUrl}${path}`
}
