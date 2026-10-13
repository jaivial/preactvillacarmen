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
  // vc_ad_preview_v1: id of the ad forced open by /?vc_ad=<id> (backoffice
  // preview); when set, closing the popover must not mark the ad as seen.

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
    // Coordination id: vc_ad_preview_v1 - /?vc_ad=<id> (backoffice preview)
    // forces that ad open ignoring isAdSeen, so an editor sees the ad even if
    // it was already dismissed; the backend date filter still applies. Without
    // vc_ad the normal once-per-session behaviour is untouched.
    const requested = Number(new URLSearchParams(window.location.search).get('vc_ad'))
    const previewId = Number.isFinite(requested) && requested > 0 ? requested : 0
    setPreviewAdId(previewId)
    let cancelled = false
    void fetchPublicAds()
      .then((ads) => {
        if (cancelled) return
        const preview = previewId > 0 ? ads.find((ad) => ad.id === previewId) : undefined
        if (preview) {
          setActiveAd(preview)
          return
        }
        setActiveAd(ads.find((ad) => !isAdSeen(ad.id)) || null)
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
      {activeAd && isHome ? <PublicAdPopover ad={activeAd} onClose={() => {
        // vc_ad_preview_v1: a previewed ad is not the real user's session, so
        // closing it never writes the seen flag.
        if (!previewAdId) markAdSeen(activeAd.id)
        setActiveAd(null)
      }} /> : null}
    </div>
  )
}
