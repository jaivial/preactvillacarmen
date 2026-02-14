import type { ApiError } from './types'

export async function apiGetJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
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

