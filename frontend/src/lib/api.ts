import type { ApiError } from './types'

const API_BASE_URL = (
  // Keep public API calls on the current origin by default so tenant-aware endpoints
  // resolve the same restaurant the user is visiting. Local dev uses the Vite `/api`
  // proxy unless an explicit VITE_API_BASE_URL override is provided.
  import.meta.env.VITE_API_BASE_URL || ''
).replace(/\/+$/, '')

function isAbsoluteUrl(path: string) {
  return /^https?:\/\//i.test(path)
}

export function apiUrl(path: string): string {
  if (isAbsoluteUrl(path)) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

// --- Request cache (stale-while-revalidate) ---
// Caches GET JSON responses in-memory so repeated navigations are instant.
// Entries expire after TTLms; cached data is returned immediately while a
// background revalidation refreshes the value.

type CacheEntry<T = unknown> = {
  value: T
  timestamp: number
  promise: Promise<T> | null
}

const API_CACHE_TTL_MS = 60_000
const apiCache = new Map<string, CacheEntry>()

export function clearApiCache(path?: string) {
  if (path) {
    apiCache.delete(path)
  } else {
    apiCache.clear()
  }
}

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init)
}

async function doFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
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

export type ApiGetInit = RequestInit & { noStore?: boolean }

export async function apiGetJson<T>(path: string, init?: ApiGetInit): Promise<T> {
  const noCache = (init?.method && init.method !== 'GET') || init?.noStore === true
  if (noCache) return doFetchJson<T>(path, init)

  const cached = apiCache.get(path) as CacheEntry<T> | undefined
  const now = Date.now()

  // Fresh cache — return immediately
  if (cached && now - cached.timestamp < API_CACHE_TTL_MS) {
    return cached.value
  }

  // Stale cache — return stale immediately, revalidate in background
  if (cached) {
    const promise = doFetchJson<T>(path, init)
      .then((value) => {
        apiCache.set(path, { value, timestamp: Date.now(), promise: null })
        return value
      })
      .catch(() => {
        // Background revalidation failed — clear in-flight so next call retries
        const entry = apiCache.get(path)
        if (entry) entry.promise = null
        // Swallow: caller already got stale data
      })
    // Stale-while-revalidate: return old data, update in background
    apiCache.set(path, { ...cached, promise })
    return cached.value
  }

  // Cold cache — await the fetch
  const value = await doFetchJson<T>(path, init)
  apiCache.set(path, { value, timestamp: Date.now(), promise: null })
  return value
}

/**
 * Prefetch an API endpoint and warm the cache without awaiting the result.
 * Useful on link hover/focus to make navigation feel instant.
 */
export function prefetchApi(path: string, init?: ApiGetInit): void {
  const noCache = (init?.method && init.method !== 'GET') || init?.noStore === true
  if (noCache) return
  if (apiCache.has(path)) return
  // Fire-and-forget — fills the cache
  void apiGetJson(path, init).catch(() => {})
}
