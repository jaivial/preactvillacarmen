import { useEffect } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { ClientFooter } from '../../components/ClientFooter'
import { ClientHeader } from '../../components/ClientHeader'
import { useLocation } from 'wouter-preact'

export function ClientLayout(props: { children: ComponentChildren }) {
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

  return (
    <div class="client-shell">
      <ClientHeader />
      <main class={mainClass}>{props.children}</main>
      {isEventosPage ? null : <ClientFooter />}
    </div>
  )
}
