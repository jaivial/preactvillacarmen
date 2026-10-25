export type ConversionName = 'reservation_start' | 'reservation_complete' | 'phone_click' | 'whatsapp_click'

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>
    gtag?: (...args: unknown[]) => void
  }
}

/** Emit consent-independent business events; an installed tag manager owns storage and forwarding. */
export function trackConversion(event: ConversionName, parameters: Record<string, string | number | boolean> = {}) {
  if (typeof window === 'undefined') return
  const payload = { event, ...parameters }
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push(payload)
  window.gtag?.('event', event, parameters)
}

const conversions: Record<string, ConversionName> = {
  'tel:': 'phone_click',
  'wa.me/': 'whatsapp_click',
  'api.whatsapp.com/': 'whatsapp_click',
}

// Delegation covers current and future contact CTAs without changing navigation.
if (typeof document !== 'undefined') {
  document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return
    const anchor = event.target.closest<HTMLAnchorElement>('a[href]')
    if (!anchor) return
    const href = anchor.getAttribute('href') || ''
    const match = Object.entries(conversions).find(([token]) => href.includes(token))
    if (match) trackConversion(match[1], { link_url: anchor.href, link_text: (anchor.textContent || '').trim().slice(0, 100) })
  }, true)
}
