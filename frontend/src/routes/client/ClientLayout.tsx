import { useEffect, useState } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { apiGetJson } from '../../lib/api'
import { normalizeMenuVisibilityResponse, normalizePublicMenusResponse } from '../../lib/backendAdapters'
import { MenuVisibilityContext } from '../../lib/menuVisibility'
import { PublicMenusContext } from '../../lib/publicMenus'
import type { MenuVisibility, PublicMenu } from '../../lib/types'
import { ClientFooter } from '../../components/ClientFooter'
import { ClientHeader } from '../../components/ClientHeader'
import { useLocation } from 'wouter-preact'

export function ClientLayout(props: { children: ComponentChildren }) {
  const [menuVisibility, setMenuVisibility] = useState<MenuVisibility | null>(null)
  const [publicMenus, setPublicMenus] = useState<PublicMenu[] | null | undefined>(undefined)
  const [location] = useLocation()

  // Scroll to top on initial load and navigation
  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [location])

  const isTopPage = location === '/'
  const isWinePage = location.startsWith('/vinos')
  const isEventosPage = location.startsWith('/eventos')

  let mainClass = 'client-main'
  if (isTopPage) mainClass += ' main--topPage'
  if (isWinePage) mainClass += ' main--wine'
  if (isEventosPage) mainClass += ' main--eventos'

  useEffect(() => {
    let cancelled = false
    const loadMenuVisibility = async () => {
      const endpoints = [
        '/api/menuVisibilityBackend/getMenuVisibility.php',
        '/api/menu-visibility',
      ]

      for (const endpoint of endpoints) {
        try {
          const data = await apiGetJson<unknown>(endpoint)
          return normalizeMenuVisibilityResponse(data)
        } catch {
          // keep trying next endpoint
        }
      }
      return {}
    }

    loadMenuVisibility()
      .then((visibility) => {
        if (cancelled) return
        setMenuVisibility(visibility)
      })
      .catch(() => {
        if (cancelled) return
        setMenuVisibility({})
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    apiGetJson<unknown>('/api/menus/public')
      .then((data) => {
        if (cancelled) return
        setPublicMenus(normalizePublicMenusResponse(data))
      })
      .catch(() => {
        if (cancelled) return
        setPublicMenus(null)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <PublicMenusContext.Provider value={publicMenus}>
      <MenuVisibilityContext.Provider value={menuVisibility}>
        <div class="client-shell">
          <ClientHeader menuVisibility={menuVisibility} />
          <main class={mainClass}>{props.children}</main>
          {isEventosPage ? null : <ClientFooter />}
        </div>
      </MenuVisibilityContext.Provider>
    </PublicMenusContext.Provider>
  )
}
