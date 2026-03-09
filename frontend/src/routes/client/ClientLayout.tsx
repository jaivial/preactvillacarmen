import { useEffect, useState } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { apiGetJson } from '../../lib/api'
import { normalizePublicMenusResponse } from '../../lib/backendAdapters'
import { PublicMenusContext } from '../../lib/publicMenus'
import type { PublicMenu } from '../../lib/types'
import { ClientFooter } from '../../components/ClientFooter'
import { ClientHeader } from '../../components/ClientHeader'
import { useLocation } from 'wouter-preact'

export function ClientLayout(props: { children: ComponentChildren }) {
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

    apiGetJson<unknown>('/api/menus/public?home_page=true')
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
      <div class="client-shell">
        <ClientHeader />
        <main class={mainClass}>{props.children}</main>
        {isEventosPage ? null : <ClientFooter />}
      </div>
    </PublicMenusContext.Provider>
  )
}
