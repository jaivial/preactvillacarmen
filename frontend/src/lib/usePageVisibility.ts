import { useEffect, useState } from 'preact/hooks'
import { useLocation } from 'wouter-preact'
import { apiGetJson } from './api'
import type { MenuSidebarResponse } from './types'

export function usePageVisibilityFlag(flag: 'cafe_page_active' | 'bebidas_page_active'): { visible: boolean; loading: boolean } {
  const [, setLocation] = useLocation()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    apiGetJson<MenuSidebarResponse>('/api/menus/sidebar')
      .then((res) => {
        if (cancelled) return
        const val = res[flag] as boolean | undefined
        setVisible(Boolean(val))
        if (!val) setLocation('/')
      })
      .catch(() => {
        if (!cancelled) setVisible(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [flag, setLocation])

  return { visible, loading }
}
