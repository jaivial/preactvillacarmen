import { useEffect, useState } from 'preact/hooks'
import { apiGetJson } from '../../lib/api'
import type { LegalPage as LegalPageData, LegalPageResponse, LegalPageSlug } from '../../lib/types'

export function LegalPage({ slug }: { slug: LegalPageSlug }) {
  const [data, setData] = useState<LegalPageData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    setData(null)
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
          <h1>ALQUERIA VILLACARMEN</h1>
          <p>C/ Sequía de Rascanya, 2, 46470, Catarroja, Valencia</p>
        </div>
        <div class="wrapperavisolegal" dangerouslySetInnerHTML={{ __html: data.contentHtml }} />
      </div>
    </div>
  )
}
