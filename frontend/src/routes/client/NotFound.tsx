import { Link } from 'wouter-preact'
import { useI18n } from '../../lib/i18n'

export function NotFound() {
  const { lang } = useI18n()
  return (
    <div class="page" data-testid="public-not-found-page">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title" data-testid="public-not-found-title">{lang === 'en' ? 'Page not found' : 'Página no encontrada'}</h1>
          <p class="page-subtitle" data-testid="public-not-found-description">{lang === 'en' ? 'The page you requested is no longer available.' : 'La página que buscas ya no está disponible.'}</p>
          <Link href="/" className="btn primary" data-testid="public-not-found-home-link">{lang === 'en' ? 'Back to home' : 'Volver al inicio'}</Link>
        </div>
      </section>
    </div>
  )
}
