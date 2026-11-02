import { useEffect, useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { useI18n } from '../lib/i18n'
import { COOKIE_CONSENT_OPEN_EVENT, readCookieConsent, saveCookieConsent, type CookieConsentChoice } from '../lib/consent'
import './CookieConsent.css'

// Coordination id: cookie_consent_v1 - rendered after mount only, so prerendered HTML never flashes it.
export function CookieConsent() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(readCookieConsent() === null)
    const show = () => setOpen(true)
    window.addEventListener(COOKIE_CONSENT_OPEN_EVENT, show)
    return () => window.removeEventListener(COOKIE_CONSENT_OPEN_EVENT, show)
  }, [])

  if (!open) return null

  const choose = (choice: CookieConsentChoice) => {
    saveCookieConsent(choice)
    setOpen(false)
  }

  return (
    <div class="vcCookie" role="dialog" aria-label={t('cookies.label')} data-testid="cookie-consent-banner">
      <p data-testid="cookie-consent-text">{t('cookies.text')}</p>
      <Link href="/protecciondatos" class="vcCookieMore" data-testid="cookie-consent-privacy-link">{t('cookies.more')}</Link>
      <div class="vcCookieActions" data-testid="cookie-consent-actions">
        <button type="button" class="vcCookieBtn" onClick={() => choose('denied')} data-testid="cookie-consent-reject">{t('cookies.reject')}</button>
        <button type="button" class="vcCookieBtn vcCookieBtn--solid" onClick={() => choose('granted')} data-testid="cookie-consent-accept">{t('cookies.accept')}</button>
      </div>
    </div>
  )
}
