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

export function activeAdsForDate(ads: PublicAd[], isoDate: string): PublicAd[] {
  return ads.filter((ad) => {
    if (!ad.active) return false
    if (!ad.starts_at && !ad.ends_at) return true
    if (!ad.starts_at || !ad.ends_at) return false
    return isoDate >= ad.starts_at && isoDate <= ad.ends_at
  })
}

export async function fetchPublicAds(isoDate = localISODate()): Promise<PublicAd[]> {
  const response = await apiGetJson<PublicAdsResponse>(`/api/public/ads?date=${encodeURIComponent(isoDate)}`)
  return activeAdsForDate(response.ads || [], isoDate)
}
