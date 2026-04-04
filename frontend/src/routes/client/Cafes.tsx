import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { motion, useReducedMotion } from 'motion/react'
import { useI18n } from '../../lib/i18n'
import { apiGetJson } from '../../lib/api'
import type { ComidaItem, ComidaItemsResponse } from '../../lib/types'
import { formatEuro } from './MenuShared'

export function Cafes() {
  const { t } = useI18n()
  const reduceMotion = useReducedMotion()
  const [items, setItems] = useState<ComidaItem[] | null | undefined>(undefined)
  const fotoUrls = useRef<Record<number, string | null>>({})
  const nodesRef = useRef<Map<number, HTMLElement>>(new Map())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const inflightFotoRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (items !== undefined) return
    let cancelled = false
    apiGetJson<ComidaItemsResponse>(`/api/comida/cafes?active=1`)
      .then((res) => {
        if (cancelled) return
        setItems(res.items || [])
      })
      .catch(() => {
        if (cancelled) return
        setItems(null)
      })
    return () => { cancelled = true }
  }, [items])

  const loadFoto = useCallback((num: number) => {
    if (num in fotoUrls.current || inflightFotoRef.current.has(num)) return
    inflightFotoRef.current.add(num)
    apiGetJson<ComidaItemsResponse>(`/api/comida/cafes/${num}`)
      .then((res) => {
        const urls: Record<number, string | null> = {}
        for (const item of res.items || []) {
          if (item.has_foto && item.foto_url) urls[item.num] = item.foto_url
          else urls[item.num] = null
        }
        Object.assign(fotoUrls.current, urls)
      })
      .catch(() => {
        fotoUrls.current[num] = null
      })
      .finally(() => {
        inflightFotoRef.current.delete(num)
      })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const num = Number((e.target as HTMLElement).dataset.itemNum)
          if (Number.isFinite(num) && num > 0) loadFoto(num)
          obs.unobserve(e.target)
        }
      },
      { rootMargin: '280px 0px', threshold: 0.15 }
    )
    observerRef.current = obs
    for (const el of nodesRef.current.values()) obs.observe(el)
    return () => { obs.disconnect(); observerRef.current = null }
  }, [loadFoto])

  const register = useCallback((num: number) => {
    return (el: HTMLElement | null) => {
      const map = nodesRef.current
      const prev = map.get(num)
      if (prev && observerRef.current) observerRef.current.unobserve(prev)
      if (!el) { map.delete(num); return }
      map.set(num, el)
      if (observerRef.current) observerRef.current.observe(el)
    }
  }, [])

  const hasContent = useMemo(() => Array.isArray(items) && items.length > 0, [items])

  return (
    <div class="page menuPage">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{t('nav.coffees')}</h1>
          <p class="page-subtitle">{t('menu.cafes.subtitle')}</p>
        </div>
      </section>

      <section class="menuBody">
        <div class="container">
          {items === undefined ? (
            <div class="menuState">{t('menus.preview.loading')}</div>
          ) : items === null ? (
            <div class="menuState">{t('cafes.error')}</div>
          ) : !hasContent ? (
            <div class="menuState">{t('cafes.empty')}</div>
          ) : (
            <div class="wineList">
              {items.map((item, idx) => {
                const foto = fotoUrls.current[item.num] || null
                return (
                  <article class="wineCardWrap" key={item.num} ref={register(item.num)} data-item-num={item.num}>
                    <motion.div
                      class="wineCard"
                      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: reduceMotion ? 0 : 0.6, ease: 'easeOut', delay: reduceMotion ? 0 : Math.min(0.22, idx * 0.025) }}
                    >
                      {item.has_foto ? (
                        <div class="winePhoto" aria-hidden="true">
                          {foto ? (
                            <img src={foto} alt="" loading="lazy" decoding="async" />
                          ) : (
                            <div class="winePhotoPlaceholder is-loading" />
                          )}
                        </div>
                      ) : null}
                      <div class="wineInfo">
                        {item.tipo && <div class="wineMeta">{item.tipo}</div>}
                        <h2 class="wineName">{item.nombre}</h2>
                        {item.descripcion && item.nombre !== item.descripcion ? <p class="wineDesc">{item.descripcion}</p> : null}
                      </div>
                      <div class="winePriceTag">{formatEuro(item.precio)}</div>
                    </motion.div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
