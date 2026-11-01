import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { motion, useReducedMotion } from 'motion/react'
import { Link } from 'wouter-preact'
import { Coffee } from 'lucide-react'
import { useI18n, localized } from '../../lib/i18n'
import { apiGetJson } from '../../lib/api'
import { prerenderData, setPrerenderData } from '../../lib/prerenderData'
import type { CafesPageSEO, ComidaItem, ComidaItemsResponse } from '../../lib/types'
import { MenuSEOContent } from '../../components/MenuSEOContent'
import { useFoodShowPrices } from '../../lib/useFoodShowPrices'
import { formatEuro } from './MenuShared'
import { EmptyState } from './functionalComponents/EmptyState/EmptyState'

// Coordination id: cafes_page_ui_v2 - carta-style coffee page: hero, optional
// type tabs, cards in a responsive grid, and a closing booking CTA.

function groupCafes(items: ComidaItem[]) {
  const byTipo: Record<string, ComidaItem[]> = {}
  for (const item of items) {
    const tipo = item.tipo || 'OTROS'
    ;(byTipo[tipo] ||= []).push(item)
  }
  return byTipo
}

export function Cafes() {
  const { t, lang } = useI18n()
  const reduceMotion = useReducedMotion()
  const showPrices = useFoodShowPrices('cafes')
  const [items, setItems] = useState<ComidaItem[] | undefined>(() => prerenderData().cafes)
  const [error, setError] = useState(false)
  const [selectedTipo, setSelectedTipo] = useState('')
  const [fotoUrls, setFotoUrls] = useState<Record<number, string | null>>({})
  const inflightFotoRef = useRef<Set<number>>(new Set())
  // Coordination id: cafes_page_seo_v1 - backoffice SEO for /cafes (H1, intro, FAQ, head).
  const [seo, setSeo] = useState<CafesPageSEO>(() => prerenderData().cafesSeo || {})

  useEffect(() => {
    let cancelled = false
    apiGetJson<ComidaItemsResponse>('/api/comida/cafes?active=1')
      .then((res) => { if (!cancelled) setItems(res.items || []) })
      .catch(() => { if (!cancelled) setError(true) })
    apiGetJson<{ seo?: CafesPageSEO }>('/api/public/cafes-seo')
      .then((res) => {
        if (cancelled || !res.seo) return
        setSeo(res.seo)
        setPrerenderData({ ...prerenderData(), cafesSeo: res.seo })
        window.dispatchEvent(new Event('villacarmen:menus-updated'))
      })
      .catch(() => { /* Defaults stay in place. */ })
    return () => { cancelled = true }
  }, [])

  const byTipo = useMemo(() => groupCafes(items || []), [items])
  const tipos = useMemo(() => Object.keys(byTipo).sort((a, b) => a.localeCompare(b)), [byTipo])
  const activeTipo = tipos.includes(selectedTipo) ? selectedTipo : tipos[0] || ''
  const visible = activeTipo ? byTipo[activeTipo] || [] : []

  const tipoLabel = useCallback((tipo: string) => {
    if (lang === 'en') return byTipo[tipo]?.find((it) => it.tipo_english)?.tipo_english || tipo
    const key = `cafe_type.${tipo}`
    const label = t(key)
    return label === key ? tipo : label
  }, [byTipo, lang, t])

  // Photos are fetched on demand, only for the coffees that have one.
  useEffect(() => {
    for (const item of visible) {
      if (!item.has_foto || item.num in fotoUrls || inflightFotoRef.current.has(item.num)) continue
      inflightFotoRef.current.add(item.num)
      apiGetJson<ComidaItemsResponse>(`/api/comida/cafes/${item.num}`)
        .then((res) => {
          const found = (res.items || []).find((it) => it.num === item.num)
          setFotoUrls((prev) => ({ ...prev, [item.num]: found?.has_foto && found.foto_url ? found.foto_url : null }))
        })
        .catch(() => setFotoUrls((prev) => ({ ...prev, [item.num]: null })))
        .finally(() => { inflightFotoRef.current.delete(item.num) })
    }
  }, [visible, fotoUrls])

  const h1 = String((lang === 'en' ? seo.seo_h1_english : seo.seo_h1) || '').trim() || t('nav.coffees')
  const loaded = items !== undefined

  return (
    <div class="page cafePage" data-testid="cafes-page" data-coordination-id="cafes_page_ui_v2">
      <section class="page-hero cafeHero" data-testid="cafes-hero">
        <div class="container cafeHeroInner">
          <span class="cafeHeroIcon" aria-hidden="true"><Coffee size={22} strokeWidth={1.6} /></span>
          <p class="cafeHeroEyebrow" data-testid="cafes-hero-eyebrow">{t('cafes.eyebrow')}</p>
          <h1 class="page-title cafeHeroTitle" data-testid="cafes-page-h1">{h1}</h1>
          <p class="page-subtitle cafeHeroLead" data-testid="cafes-hero-lead">{t('cafes.lead')}</p>
          {items && items.length > 0 ? (
            <p class="cafeHeroCount" data-testid="cafes-hero-count">{`${items.length} ${t(items.length === 1 ? 'cafes.count.one' : 'cafes.count.many')}`}</p>
          ) : null}
        </div>
      </section>

      <section class="cafeBody" data-testid="cafes-body">
        <div class="container">
          {error && !items?.length ? (
            <div class="menuState" data-testid="cafes-error">{t('cafes.error')}</div>
          ) : !loaded ? (
            <div class="menuState" data-testid="cafes-loading">{t('menus.preview.loading')}</div>
          ) : visible.length === 0 ? (
            <EmptyState title={t('cafes.empty')} />
          ) : (
            <>
              {tipos.length > 1 ? (
                <div class="cafeTabsSticky" role="tablist" aria-label={t('nav.coffees')} data-testid="cafes-tabs">
                  <div class="cafeTabs">
                    {tipos.map((tipo) => {
                      const active = tipo === activeTipo
                      return (
                        <button key={tipo} type="button" class={active ? 'cafeTab is-active' : 'cafeTab'} onClick={() => setSelectedTipo(tipo)} role="tab" aria-selected={active} data-testid={`cafes-tab-${tipo}`}>
                          {active ? (
                            <motion.span class="cafeTabBubble" layoutId="cafeTabBubble" transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30, mass: 1.15 }} />
                          ) : null}
                          <span class="cafeTabLabel">{tipoLabel(tipo)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <ol class="cafeGrid" data-testid="cafes-grid">
                {visible.map((item, idx) => {
                  const foto = fotoUrls[item.num]
                  const price = showPrices && Number(item.precio) > 0 ? formatEuro(item.precio) : ''
                  const description = item.description_enabled !== false && item.descripcion && item.nombre !== item.descripcion
                    ? localized(item.descripcion, item.descripcion_english, lang)
                    : ''
                  return (
                    <motion.li
                      key={item.num}
                      class={item.has_foto ? 'cafeItem has-photo' : 'cafeItem'}
                      data-testid={`cafe-item-${item.num}`}
                      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: reduceMotion ? 0 : 0.45, ease: 'easeOut', delay: reduceMotion ? 0 : Math.min(0.24, idx * 0.04) }}
                    >
                      {item.has_foto ? (
                        <div class="cafeItemPhoto" aria-hidden="true" data-testid={`cafe-photo-${item.num}`}>
                          {foto ? <img src={foto} alt="" loading="lazy" decoding="async" /> : <div class="cafeItemPhotoPlaceholder" />}
                        </div>
                      ) : null}
                      <div class="cafeItemBody">
                        <div class="cafeItemHead">
                          <h3 class="cafeItemName" data-testid={`cafe-name-${item.num}`}>{localized(item.nombre, item.nombre_english, lang)}</h3>
                          {price ? <span class="cafeItemPrice" data-testid={`cafe-price-${item.num}`}>{price}</span> : null}
                        </div>
                        {description ? (
                          <p class="cafeItemDesc" data-testid={`cafe-description-${item.num}`}>{description}</p>
                        ) : null}
                      </div>
                    </motion.li>
                  )
                })}
              </ol>
            </>
          )}

          <aside class="cafeOutro" data-testid="cafes-outro">
            <p class="cafeOutroText" data-testid="cafes-outro-text">{t('cafes.outro')}</p>
            <Link href="/reservas" className="btn primary" data-testid="cafes-outro-reserve">{t('nav.reserve')}</Link>
          </aside>
        </div>
      </section>
      <MenuSEOContent menu={seo} aboutKey="cafes.seo.about" />
    </div>
  )
}
