import { useEffect, useState } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { ClientFooter } from '../../components/ClientFooter'
import { ClientHeader } from '../../components/ClientHeader'
import { useLocation } from 'wouter-preact'
import { PublicAdPopover } from '../../components/PublicAdPopover'
import { fetchPublicAds, isAdSeen, markAdSeen, type PublicAd } from '../../lib/publicAds'

export function ClientLayout(props: { children: ComponentChildren }) {
  const [location] = useLocation()
  const [activeAd, setActiveAd] = useState<PublicAd | null>(null)

  const isHome = location === '/'

  // Coordination id: public_ad_seen_once_v1 - ads only on the home page, and
  // each ad at most once per session (closing it with the X marks it as seen).
  useEffect(() => {
    if (!isHome) {
      setActiveAd(null)
      return
    }
    let cancelled = false
    void fetchPublicAds()
      .then((ads) => {
        if (!cancelled) setActiveAd(ads.find((ad) => !isAdSeen(ad.id)) || null)
      })
      .catch(() => {
        if (!cancelled) setActiveAd(null)
      })
    return () => { cancelled = true }
  }, [isHome])

  // Scroll to top on initial load and navigation
  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [location])

  const isTopPage = isHome
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
      {activeAd && isHome ? <PublicAdPopover ad={activeAd} onClose={() => { markAdSeen(activeAd.id); setActiveAd(null) }} /> : null}
    </div>
  )
}
