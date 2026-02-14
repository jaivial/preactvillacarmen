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
        </div>

        <div class="footer-col">
          <p class="footer-title">{t('footer.contact')}</p>
          <a class="footer-link" href="https://wa.me/34638857294" target="_blank" rel="noreferrer">
            WhatsApp: 638 85 72 94
          </a>
          <a
            class="footer-link"
            href="https://www.google.com/maps?q=alqueria+villacarmen&um=1&ie=UTF-8&sa=X"
            target="_blank"
            rel="noreferrer"
          >
            {t('footer.openMaps')}
          </a>
        </div>

        <div class="footer-col">
          <p class="footer-title">{t('footer.social')}</p>
          <div class="footer-social">
            <a href="https://www.facebook.com/villacarmenalqueria/" target="_blank" rel="noreferrer" aria-label="Facebook">
              <FacebookIcon />
            </a>
            <a
              href="https://www.instagram.com/alqueria_villacarmen/?hl=es"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
            >
              <InstagramIcon />
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

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M13.5 22v-8h2.7l.4-3H13.5V9.1c0-.9.2-1.6 1.6-1.6h1.6V4.8c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.3V11H7.5v3h2.6v8h3.4z"
      />
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
