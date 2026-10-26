import { useEffect, useState } from 'preact/hooks'
import { apiGetJson } from '../../lib/api'
import type { LegalPage as LegalPageData, LegalPageResponse, LegalPageSlug } from '../../lib/types'
import { prerenderData } from '../../lib/prerenderData'
import { useI18n } from '../../lib/i18n'
import { RESTAURANT } from '../../lib/restaurant'

const legalTitles: Record<LegalPageSlug, string> = {
  'aviso-legal': 'Aviso legal', 'booking-policies': 'Política de reservas', 'proteccion-datos': 'Política de privacidad', 'special-booking-politics': 'Política de fechas especiales',
}

function contentWithoutDuplicateH1(html: string): string {
  return html.replace(/<(\/?)h1(?=[\s>])/gi, '<$1h2')
}

export function LegalPage({ slug }: { slug: LegalPageSlug }) {
  const { lang } = useI18n()
  const [data, setData] = useState<LegalPageData | null>(() => prerenderData().legalPages?.[slug] || null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    setData(prerenderData().legalPages?.[slug] || null)
    setError(false)
    apiGetJson<LegalPageResponse>('/api/public/legal-page?slug=' + slug)
      .then((r) => {
        if (!alive) return
        setData({
          slug: r.slug,
          title: r.title,
          contentHtml: r.contentHtml,
          contentJson: r.contentJson,
          updatedAt: r.updatedAt,
        })
      })
      .catch(() => {
        if (alive) setError(true)
      })
    return () => {
      alive = false
    }
  }, [slug])

  if (error) {
    return (
      <div class="page legalPage">
        <div class="containeravisolegal">
          <p>No se pudo cargar la página.</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div class="page legalPage">
        <div class="containeravisolegal">
          <p>Cargando…</p>
        </div>
      </div>
    )
  }

  return (
    <div class="page legalPage">
      <div class="containeravisolegal">
        <div class="headeravisolegal">
          <p class="legal-wordmark">ALQUERIA VILLACARMEN</p>
          <p>C/ Sequía de Rascanya, 2, 46470, Catarroja, Valencia</p>
        </div>
        {lang === 'en' ? <p>The authoritative legal document below is published in Spanish.</p> : null}
        <div lang={lang === 'en' ? 'es' : undefined}>
          <h1>{legalTitles[slug]}</h1>
          {slug === 'aviso-legal' ? <p>Este sitio web ofrece información del restaurante, sus menús, celebraciones y reservas de Alquería Villa Carmen. Para consultas sobre el sitio o sus servicios, escribe a {RESTAURANT.email} o llama al {RESTAURANT.phone}. Nuestra dirección es {RESTAURANT.street}, {RESTAURANT.postalCode} {RESTAURANT.locality}, {RESTAURANT.region}.</p> : null}
          <div class="wrapperavisolegal" dangerouslySetInnerHTML={{ __html: contentWithoutDuplicateH1(data.contentHtml) }} />
        </div>
      </div>
    </div>
  )
}
