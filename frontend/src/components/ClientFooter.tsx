import { useI18n } from '../lib/i18n'

export function ClientFooter() {
  const { t } = useI18n()
  return (
    <footer class="footer">
      <div class="container footer-grid">
        <div class="footer-col">
          <div class="footer-wordmark">Villa Carmen</div>
          <p class="footer-small">
            C/ Sequia de Rascanya, 2
            <br />
            46470 Catarroja, Valencia
          </p>
          <a
            class="footer-maps"
            href="https://www.google.com/maps?q=alqueria+villacarmen&um=1&ie=UTF-8&sa=X"
            target="_blank"
            rel="noreferrer"
          >
            <img
              class="footer-maps-icon"
              src="https://cdn.jsdelivr.net/gh/selfhst/icons/svg/google-maps-dark.svg"
              alt=""
              width="18"
              height="18"
              loading="lazy"
              decoding="async"
            />
            <span>{t('footer.openMaps')}</span>
          </a>
        </div>

        <div class="footer-col">
          <p class="footer-title">{t('footer.contact')}</p>
          <a class="footer-link footer-link--icon" href="https://wa.me/34638857294" target="_blank" rel="noreferrer">
            <img
              class="footer-link-icon"
              src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/whatsapp.svg"
              alt=""
              width="18"
              height="18"
              loading="lazy"
              decoding="async"
            />
            <span>638 85 72 94</span>
          </a>
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
