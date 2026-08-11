import { prefetchApi } from './api'

/**
 * Maps public route paths to the API endpoints they fetch on mount.
 * Used by `useNavPrefetch` to warm the API cache on link hover so
 * navigation feels instant.
 */
const ROUTE_API_MAP: Record<string, string[]> = {
  '/vinos': ['/api/vinos?tipo=TINTO&include_image=0'],
  '/postres': ['/api/comida/postres?active=1'],
  '/cafes': ['/api/comida/cafes?active=1'],
  '/bebidas': ['/api/comida/bebidas?active=1'],
  '/contacto': [],
  '/reservas': [],
  '/eventos': [],
  '/menudeldia': ['/api/menus/dia'],
  '/menufindesemana': ['/api/menus/finde'],
}

/**
 * Prefetch all API endpoints associated with a route path.
 * Call on link hover/focus/touch for instant navigation.
 */
export function prefetchRoute(path: string): void {
  const endpoints = ROUTE_API_MAP[path]
  if (!endpoints) return
  for (const ep of endpoints) {
    prefetchApi(ep)
  }
}
