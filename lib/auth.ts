/**
 * Authentication utilities for admin panel
 */

export interface AdminUser {
  id: string
  email: string
  role: string
}

const TOKEN_KEY = 'admin_token'
const USER_KEY = 'admin_user'

export const authService = {
  setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token)
    }
  },

  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(TOKEN_KEY)
  },

  removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }
  },

  setUser(user: AdminUser): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    }
  },

  getUser(): AdminUser | null {
    if (typeof window === 'undefined') return null
    const userStr = localStorage.getItem(USER_KEY)
    if (!userStr) return null
    try {
      return JSON.parse(userStr) as AdminUser
    } catch {
      return null
    }
  },

  isAuthenticated(): boolean {
    const token = this.getToken()
    const user = this.getUser()
    return !!token && !!user && user.role === 'admin'
  },

  getAuthHeaders(): HeadersInit {
    const token = this.getToken()
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  },
}
