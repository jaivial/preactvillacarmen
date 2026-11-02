// Coordination id: cookie_consent_v1 - index.html reads the same storage key for the GA consent default.
export type CookieConsentChoice = 'granted' | 'denied'

const STORAGE_KEY = 'vc_cookie_consent'
export const COOKIE_CONSENT_OPEN_EVENT = 'vc:cookie-consent-open'

export function readCookieConsent(): CookieConsentChoice | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    return null
  }
}

export function saveCookieConsent(choice: CookieConsentChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, choice)
  } catch {
    // Storage blocked: the choice still applies for this page view.
  }
  window.gtag?.('consent', 'update', { analytics_storage: choice })
}

export function openCookieConsent() {
  window.dispatchEvent(new Event(COOKIE_CONSENT_OPEN_EVENT))
}
