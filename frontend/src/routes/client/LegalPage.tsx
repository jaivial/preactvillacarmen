import { useEffect, useState } from 'preact/hooks'
import { apiGetJson } from '../../lib/api'
import type { LegalPage as LegalPageData, LegalPageResponse, LegalPageSlug } from '../../lib/types'
import { prerenderData } from '../../lib/prerenderData'
import { useI18n } from '../../lib/i18n'

const legalTitles: Record<'es' | 'en', Record<LegalPageSlug, string>> = {
  es: { 'aviso-legal': 'Aviso legal', 'booking-policies': 'Política de reservas', 'proteccion-datos': 'Política de privacidad', 'special-booking-politics': 'Política de fechas especiales' },
  en: { 'aviso-legal': 'Legal notice', 'booking-policies': 'Booking policy', 'proteccion-datos': 'Privacy policy', 'special-booking-politics': 'Special-date booking policy' },
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
        <h1>{legalTitles[lang][slug]}</h1>
        {slug === 'aviso-legal' ? <p>{lang === 'en' ? 'This website provides restaurant, menu, event and booking information for Alqueria Villa Carmen. For questions about this website or its services, contact reservas@alqueriavillacarmen.com or call +34 961 22 20 36. Our address is C/ Sequía de Rascanya, 2, 46470 Catarroja, Valencia.' : 'Este sitio web ofrece información del restaurante, sus menús, celebraciones y reservas de Alquería Villa Carmen. Para consultas sobre el sitio o sus servicios, escribe a reservas@alqueriavillacarmen.com o llama al +34 961 22 20 36. Nuestra dirección es C/ Sequía de Rascanya, 2, 46470 Catarroja, Valencia.'}</p> : null}
        <div class="wrapperavisolegal" dangerouslySetInnerHTML={{ __html: contentWithoutDuplicateH1(data.contentHtml) }} />
      </div>
    </div>
  )
}
