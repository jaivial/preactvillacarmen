import { useEffect, useState } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { apiGetJson } from '../../lib/api'
import { MenuVisibilityContext } from '../../lib/menuVisibility'
import type { MenuVisibility, MenuVisibilityResponse } from '../../lib/types'
import { ClientFooter } from '../../components/ClientFooter'
import { ClientHeader } from '../../components/ClientHeader'
import { useLocation } from 'wouter-preact'

export function ClientLayout(props: { children: ComponentChildren }) {
  const [menuVisibility, setMenuVisibility] = useState<MenuVisibility | null>(null)
  const [location] = useLocation()
  const isTopPage = location === '/'

  useEffect(() => {
    let cancelled = false
    apiGetJson<MenuVisibilityResponse>('/api/menu-visibility')
      .then((data) => {
        if (cancelled) return
        setMenuVisibility(data.menuVisibility || {})
      })
      .catch(() => {
        if (cancelled) return
        setMenuVisibility({})
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <MenuVisibilityContext.Provider value={menuVisibility}>
      <div class="client-shell">
        <ClientHeader menuVisibility={menuVisibility} />
        <main class={isTopPage ? 'client-main main--topPage' : 'client-main'}>{props.children}</main>
        <ClientFooter />
      </div>
    </MenuVisibilityContext.Provider>
  )
}
