import type { ApiError } from './types'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? 'https://herorestaurant.com' : 'http://localhost:8080')
).replace(/\/+$/, '')

function isAbsoluteUrl(path: string) {
  return /^https?:\/\//i.test(path)
}

export function apiUrl(path: string): string {
  if (isAbsoluteUrl(path)) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init)
}

export async function apiGetJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  })

  const data = (await res.json().catch(() => null)) as unknown

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && data !== null && 'message' in data && typeof (data as any).message === 'string'
        ? (data as any).message
        : `HTTP ${res.status}`) || `HTTP ${res.status}`
    throw new Error(message)
  }

  if (data && typeof data === 'object' && data !== null && 'success' in data) {
    const maybe = data as ApiError | { success: true }
    if (maybe.success === false) {
      throw new Error(maybe.message || 'Error')
    }
  }

  return data as T
}
