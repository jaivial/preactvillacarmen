import { Link } from 'wouter-preact'
import { useI18n } from '../../lib/i18n'

export function Placeholder(props: { title?: string; titleKey?: string }) {
  const { t } = useI18n()
  const title = props.titleKey ? t(props.titleKey) : props.title || ''
  return (
    <div class="page">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{title}</h1>
          <p class="page-subtitle">{t('placeholder.subtitle')}</p>
          <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/" className="btn primary">
              {t('placeholder.backHome')}
            </Link>
            <Link href="/contacto" className="btn">
              {t('placeholder.contact')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
