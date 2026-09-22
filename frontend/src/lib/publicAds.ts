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

export type PublicAd = {
  id: number
  name: string
  active: boolean
  content: PublicAdContent[]
  ctas: PublicAdCTA[]
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
