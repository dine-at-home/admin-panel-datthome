import { authService } from './auth'
import { getApiUrl } from './api-config'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
  message?: string
}

export interface PaginatedApiResponse<T> {
  success: boolean
  data: T[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  error?: string
}

const buildHeaders = (extra?: HeadersInit): HeadersInit => ({
  'Content-Type': 'application/json',
  ...authService.getAuthHeaders(),
  ...(extra || {}),
})

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(getApiUrl(path), { headers: buildHeaders() })
  const json = (await res.json().catch(() => ({}))) as ApiResponse<T>
  if (res.status === 401) {
    authService.removeToken()
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed (${res.status})`)
  }
  return json.data as T
}

export async function apiGetPaginated<T>(
  path: string
): Promise<{ items: T[]; total: number; page: number; totalPages: number }> {
  const res = await fetch(getApiUrl(path), { headers: buildHeaders() })
  const json = (await res.json().catch(() => ({}))) as PaginatedApiResponse<T>
  if (res.status === 401) {
    authService.removeToken()
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed (${res.status})`)
  }
  return {
    items: json.data || [],
    total: json.pagination?.total || 0,
    page: json.pagination?.page || 1,
    totalPages: json.pagination?.totalPages || 1,
  }
}

export async function apiSend<T>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(getApiUrl(path), {
    method,
    headers: buildHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = (await res.json().catch(() => ({}))) as ApiResponse<T>
  if (res.status === 401) {
    authService.removeToken()
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok || json.success === false) {
    throw new Error(json.error || `Request failed (${res.status})`)
  }
  return json.data as T
}

export const fmtMoney = (amount: number | null | undefined, currency = 'ISK'): string => {
  if (amount === null || amount === undefined) return '—'
  try {
    return new Intl.NumberFormat('is-IS', {
      style: 'currency',
      currency: currency.toUpperCase() || 'ISK',
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${amount.toFixed(0)} ${currency}`
  }
}

export const fmtDateTime = (value: string | Date | null | undefined): string => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const fmtDate = (value: string | Date | null | undefined): string => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}
