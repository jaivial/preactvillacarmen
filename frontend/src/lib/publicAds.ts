import { apiGetJson } from './api'

export type PublicAdContent = {
  id: string
  type: 'title' | 'subtitle' | 'text' | 'image'
  value: string
  align?: 'left' | 'center' | 'right'
}

export type PublicAdCTA = {
  id: string
  text: string
  color: string
  navigation_mode: 'route' | 'custom'
  route?: string
  custom_url?: string
  /** Content index the button renders before (ads_button_slot_v1); absent = actions row. */
  slot?: number
}

export type PublicAdCanvasVariant = {
  container?: PublicAdCanvas["container"];
  width: number
  height: number
}

export type PublicAdCanvas = {
  width: number
  height: number
  /** Per-breakpoint overrides (ads_canvas_breakpoints_v1); absent = base doc. */
  variants?: { tablet?: PublicAdCanvasVariant; mobile?: PublicAdCanvasVariant }
  /** Popover chrome overrides (ads_canvas_container_v1); absent = site defaults. */
  container?: { maxWidth?: number; overlay?: string; radius?: number } | null
}

export type PublicAdStep = { id: string; title: string; description: string; content: PublicAdContent[]; buttons: PublicAdCTA[]; see_more?: boolean; background_mode: string; background_color?: string; background_image?: string; detail_background_mode?: string; detail_background_color?: string; detail_background_image?: string; canvas?: PublicAdCanvas | null; /** ads_step_card_canvas_v1: free-form card face; absent = classic card. */ card_canvas?: PublicAdCanvas | null }

export type PublicAd = {
  layout?: { mode: "unico" | "multiple"; steps: PublicAdStep[] };
  id: number
  name: string
  active: boolean
  content: PublicAdContent[]
  ctas: PublicAdCTA[]
  /** Free-form canvas ads (ads_canvas_v1) render 1-1 through the render endpoint iframe. */
  canvas?: PublicAdCanvas | null
  starts_at?: string | null
  ends_at?: string | null
}

type PublicAdsResponse = {
  success: true
  restaurant_id: number
  ads: PublicAd[]
}

export function localISODate(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Canonical ad visibility: a missing start/end date means "unbounded", so an
 * active ad with no dates (or only one of them) is always shown.
 * Mirrors publicAdVisibleOnDate in the backend (`internal/api/public_ads.go`).
 */
export function activeAdsForDate(ads: PublicAd[], isoDate: string): PublicAd[] {
  return ads.filter((ad) => {
    if (!ad.active) return false
    if (ad.starts_at && isoDate < ad.starts_at) return false
    if (ad.ends_at && isoDate > ad.ends_at) return false
    return true
  })
}

export async function fetchPublicAds(isoDate = localISODate()): Promise<PublicAd[]> {
  const response = await apiGetJson<PublicAdsResponse>(`/api/public/ads?date=${encodeURIComponent(isoDate)}`)
  return activeAdsForDate(response.ads || [], isoDate)
}

// Preview reads scheduled ads without changing live visibility or seen state.
export async function fetchPreviewAd(adId: number): Promise<PublicAd | null> {
  const response = await apiGetJson<PublicAdsResponse>('/api/public/ads')
  return (response.ads || []).find((ad) => ad.id === adId) || null
}

// Coordination id: public_ad_seen_once_v1 - an ad closed with the X is marked
// as seen for the browser session and never shown again in that session.
const SEEN_ADS_KEY = 'vc_seen_ad_ids'

function readSeenAdIds(): number[] {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(SEEN_ADS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === 'number') : []
  } catch {
    return []
  }
}

export function isAdSeen(adId: number): boolean {
  return readSeenAdIds().includes(adId)
}

export function markAdSeen(adId: number): void {
  try {
    const seen = readSeenAdIds()
    if (!seen.includes(adId)) sessionStorage.setItem(SEEN_ADS_KEY, JSON.stringify([...seen, adId]))
  } catch {
    console.warn('[public_ad_seen_once_v1] sessionStorage unavailable')
  }
}

// Coordination id: ads_canvas_breakpoints_v1 - same thresholds as the backend
// render endpoint (internal/api/ads_canvas.go) and the backoffice studio.
export function adVariantForWidth(vw: number): 'mobile' | 'tablet' | 'desktop' {
  if (vw > 0 && vw < 768) return 'mobile'
  if (vw > 0 && vw < 1024) return 'tablet'
  return 'desktop'
}

/** Dims of the canvas document that renders at the given viewport width. */
export function adCanvasDimsForWidth(canvas: PublicAdCanvas, vw: number): { width: number; height: number; variant: string } {
  const variant = adVariantForWidth(vw)
  const dims = variant === 'desktop' ? null : canvas.variants?.[variant]
  return dims ? { ...dims, variant } : { width: canvas.width, height: canvas.height, variant }
}
