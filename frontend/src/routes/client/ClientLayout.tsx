import { useEffect, useState } from 'preact/hooks'
import type { ComponentChildren } from 'preact'
import { ClientFooter } from '../../components/ClientFooter'
import { ClientHeader } from '../../components/ClientHeader'
import { Breadcrumbs } from '../../components/Breadcrumbs'
import { useLocation } from 'wouter-preact'
import { PublicAdPopover } from '../../components/PublicAdPopover'
import { fetchPublicAds, fetchPreviewAd, isAdSeen, markAdSeen, type PublicAd } from '../../lib/publicAds'

export function ClientLayout(props: { children: ComponentChildren }) {
  const [location] = useLocation()
  const [activeAd, setActiveAd] = useState<PublicAd | null>(null)

  const [previewAdId, setPreviewAdId] = useState(0)
  const isHome = location === '/'

  // Coordination id: public_ad_seen_once_v1 - ads only on the home page, and
  // each ad at most once per session (closing it with the X marks it as seen).
  useEffect(() => {
    if (!isHome) {
      setPreviewAdId(0)
      setActiveAd(null)
      return
    }
    let cancelled = false
    const query = new URLSearchParams(window.location.search)
    // ads_html_editor_v1: the backoffice ad editor draws the home behind the
    // ad it is editing (?vc_preview=1&vc_ads=0): no ad of the site on top.
    if (query.get('vc_ads') === '0') {
      setPreviewAdId(0)
      setActiveAd(null)
      return
    }
    const requested = Number(query.get('vc_ad'))
    const previewId = Number.isSafeInteger(requested) && requested > 0 ? requested : 0
    setPreviewAdId(previewId)
    // Preserve main vc_ad preview and read scheduled saved ads without live visibility changes.
    if (previewId > 0) {
      void fetchPreviewAd(previewId).then((ad) => { if (!cancelled) setActiveAd(ad) }).catch(() => { if (!cancelled) setActiveAd(null) })
    } else {
      void fetchPublicAds().then((ads) => { if (!cancelled) setActiveAd(ads.find((ad) => !isAdSeen(ad.id)) || null) }).catch(() => { if (!cancelled) setActiveAd(null) })
    }
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
  const isEventosPage = location === '/eventos'

  let mainClass = 'client-main'
  if (isTopPage) mainClass += ' main--topPage'
  if (isWinePage) mainClass += ' main--wine'
  if (isEventosPage) mainClass += ' main--eventos'

  return (
    <div class="client-shell">
      <ClientHeader />
      <main class={mainClass}>
        {!isHome && !isEventosPage ? <Breadcrumbs /> : null}
        {props.children}
      </main>
      {isEventosPage ? null : <ClientFooter />}
      {activeAd && isHome ? <PublicAdPopover ad={activeAd} onClose={() => { if (!previewAdId) markAdSeen(activeAd.id); setActiveAd(null) }} /> : null}
    </div>
  )
}
