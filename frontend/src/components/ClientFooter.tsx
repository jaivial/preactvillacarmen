import { MapPin, Phone } from 'lucide-react'
import { Link } from 'wouter-preact'
import { useI18n } from '../lib/i18n'
import { OPENING_HOURS, RESTAURANT } from '../lib/restaurant'

export function ClientFooter() {
  const { t, lang } = useI18n()
  return (
    <footer class="footer">
      <div class="container footer-grid">
        <div class="footer-col">
          <div class="footer-wordmark">Alqueria Villa Carmen</div>
          <p class="footer-small">
            {RESTAURANT.street}
            <br />
            {RESTAURANT.postalCode} {RESTAURANT.locality}, {RESTAURANT.region}
          </p>
          <address class="footer-small footer-address">
            {OPENING_HOURS.map((entry) => <span key={entry.days.join('-')}>{entry[lang]}</span>)}
          </address>
          <a
            class="footer-maps"
            href={RESTAURANT.directions}
            target="_blank"
            rel="noreferrer"
          >
            <MapPin class="footer-maps-icon" size={19} strokeWidth={1.8} aria-hidden="true" />
            <span>{t('footer.openMaps')}</span>
          </a>
        </div>

        <div class="footer-col">
          <p class="footer-title">{t('footer.contact')}</p>
          <div class="footer-contact-phone">
            <span class="footer-contact-number">+34 638 85 72 94</span>
            <div class="footer-contact-actions" aria-label={lang === 'es' ? 'Contactar por teléfono o WhatsApp' : 'Contact by phone or WhatsApp'}>
              <a class="footer-contact-action" href={`tel:${RESTAURANT.phone}`}>
                <Phone class="footer-link-icon" size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>{lang === 'es' ? 'Llamar' : 'Call'}</span>
              </a>
              <a class="footer-contact-action" href={`https://wa.me/${RESTAURANT.phone.replace('+', '')}`} target="_blank" rel="noreferrer">
                <WhatsAppIcon />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
          <a class="footer-link footer-link--icon" href="mailto:reservas@alqueriavillacarmen.com">
            <MailIcon />
            <span>reservas@alqueriavillacarmen.com</span>
          </a>
        </div>

        <div class="footer-col">
          <p class="footer-title">{t('footer.social')}</p>
          <div class="footer-social">
            <a
              class="footer-social-link"
              href="https://www.instagram.com/alqueria_villacarmen/?hl=es"
              target="_blank"
              rel="noreferrer"
            >
              <InstagramIcon />
              <span>@alqueria_villacarmen</span>
            </a>
          </div>
        </div>
      </div>
      <nav class="container footer-nav" aria-label={lang === 'es' ? 'Explorar Villa Carmen' : 'Explore Villa Carmen'}>
        <div class="footer-nav-group"><p class="footer-title">{lang === 'es' ? 'Descubre' : 'Discover'}</p><Link href="/arroces-y-paellas">{t('home.discovery.rice')}</Link><Link href="/menusdegrupos">{t('nav.groupMenus')}</Link><Link href="/eventos">{t('nav.weddingsEvents')}</Link></div>
        <div class="footer-nav-group"><p class="footer-title">{lang === 'es' ? 'Celebraciones' : 'Celebrations'}</p><Link href="/bodas">{t('home.discovery.wedding')}</Link><Link href="/comuniones">{t('home.discovery.communion')}</Link><Link href="/eventos-empresa">{t('home.discovery.business')}</Link></div>
        <div class="footer-nav-group"><p class="footer-title">{lang === 'es' ? 'Guías y recursos' : 'Guides and resources'}</p><Link href="/guia-arroces-valencianos">{t('resource.riceGuide')}</Link><Link href="/checklist-celebraciones">{t('resource.celebrationChecklist')}</Link></div>
        <div class="footer-nav-group"><p class="footer-title">{lang === 'es' ? 'Tu visita' : 'Your visit'}</p><Link href="/contacto">{t('nav.contact')}</Link><Link href="/reservas">{t('nav.reserve')}</Link></div>
      </nav>
      <div class="container footer-bottom">
        <span>© {new Date().getFullYear()} Alqueria Villa Carmen</span>
      </div>
    </footer>
  )
}

function MailIcon() {
  return (
    <svg
      class="footer-link-icon"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}

function WhatsAppIcon() {
  return (
    <svg class="footer-link-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M12.04 2a9.84 9.84 0 0 0-8.51 14.78L2 22l5.37-1.41A9.96 9.96 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.19.84.85-3.11-.2-.32a8.11 8.11 0 1 1 7.02 3.91Zm4.47-6.08c-.24-.12-1.45-.71-1.67-.8-.22-.08-.39-.12-.55.13-.16.24-.63.79-.77.95-.14.16-.28.18-.53.06-.24-.12-1.03-.38-1.97-1.22a7.4 7.4 0 0 1-1.36-1.69c-.14-.24-.02-.37.1-.49.11-.11.25-.28.37-.43.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.43-.06-.12-.55-1.32-.75-1.8-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.3-.22.24-.85.83-.85 2.03s.87 2.36 1 2.52c.12.16 1.72 2.63 4.17 3.69.58.25 1.04.4 1.4.51.59.19 1.12.16 1.54.1.47-.07 1.45-.59 1.65-1.17.2-.57.2-1.07.14-1.17-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm9 2h-9A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4z"
      />
      <path fill="currentColor" d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
      <path fill="currentColor" d="M17.8 6.6a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
    </svg>
  )
}
