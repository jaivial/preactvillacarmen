import { Link } from 'wouter-preact'
import { useI18n } from '../../lib/i18n'

export function MenuUnavailable(props: { title?: string; message?: string }) {
  const { t } = useI18n()

  return (
    <div class="page menuPage">
      <section class="menuBody">
        <div class="container">
          <article class="menuUnavailableCard">
            <p class="menuUnavailableKicker">{t('nav.menus')}</p>
            <h1 class="menuUnavailableTitle">{props.title || t('menu.fallback.title')}</h1>
            <p class="menuUnavailableText">{props.message || t('menu.fallback.body')}</p>
            <Link href="/" className="btn primary menuUnavailableCta">
              {t('menu.fallback.home')}
            </Link>
          </article>
        </div>
      </section>
    </div>
  )
}
