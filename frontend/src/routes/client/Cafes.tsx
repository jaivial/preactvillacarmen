import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { motion, useReducedMotion } from 'motion/react'
import { useI18n } from '../../lib/i18n'
import { apiGetJson } from '../../lib/api'
import type { ComidaItem, ComidaItemsResponse } from '../../lib/types'
import { formatEuro } from './MenuShared'

type CafesState = {
  loaded: boolean
  itemsByTipo: Record<string, ComidaItem[]>
  error: boolean
}

export function Cafes() {
  const { t } = useI18n()
  const reduceMotion = useReducedMotion()
  const [state, setState] = useState<CafesState>({ loaded: false, itemsByTipo: {}, error: false })
  const [selectedTipo, setSelectedTipo] = useState<string>('')
  const fotoUrls = useRef<Record<number, string | null>>({})
  const nodesRef = useRef<Map<number, HTMLElement>>(new Map())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const inflightFotoRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    let cancelled = false
    apiGetJson<ComidaItemsResponse>(`/api/comida/cafes?active=1`)
      .then((res) => {
        if (cancelled) return
        const byTipo: Record<string, ComidaItem[]> = {}
        for (const item of res.items || []) {
          const tipo = item.tipo || 'OTROS'
          if (!byTipo[tipo]) byTipo[tipo] = []
          byTipo[tipo].push(item)
        }
        const tipos = Object.keys(byTipo).sort((a, b) => a.localeCompare(b))
        setState({ loaded: true, itemsByTipo: byTipo, error: false })
        if (!selectedTipo && tipos.length > 0) {
          setSelectedTipo(tipos[0])
        }
      })
      .catch(() => {
        if (!cancelled) setState((prev) => ({ ...prev, loaded: true, error: true }))
      })
    return () => { cancelled = true }
  }, [])

  const availableTypes = useMemo(
    () => Object.keys(state.itemsByTipo).sort((a, b) => a.localeCompare(b)),
    [state.itemsByTipo]
  )

  const items = selectedTipo ? state.itemsByTipo[selectedTipo] : undefined

  useEffect(() => {
    if (availableTypes.length > 0 && !selectedTipo) {
      setSelectedTipo(availableTypes[0])
    }
  }, [availableTypes, selectedTipo])

  const loadFoto = useCallback((num: number) => {
    if (num in fotoUrls.current || inflightFotoRef.current.has(num)) return
    inflightFotoRef.current.add(num)
    apiGetJson<ComidaItemsResponse>(`/api/comida/cafes/${num}`)
      .then((res) => {
        for (const item of res.items || []) {
          if (item.has_foto && item.foto_url) fotoUrls.current[item.num] = item.foto_url
          else fotoUrls.current[item.num] = null
        }
      })
      .catch(() => { fotoUrls.current[num] = null })
      .finally(() => { inflightFotoRef.current.delete(num) })
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
    <div class="page cafePage">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{t('nav.coffees')}</h1>
          <p class="page-subtitle">{t('menu.cafes.subtitle')}</p>
        </div>
      </section>

      <section class="cafeBody">
        <div class="container">
          {state.error ? (
            <div class="menuState">{t('cafes.error')}</div>
          ) : !state.loaded ? (
            <div class="menuState">{t('menus.preview.loading')}</div>
          ) : (
            <>
              {availableTypes.length > 1 && (
                <div class="cafeTabsSticky" role="tablist" aria-label={t('nav.coffees')}>
                  <div class="cafeTabs">
                    {availableTypes.map((tipo) => {
                      const active = tipo === selectedTipo
                      return (
                        <button
                          key={tipo}
                          type="button"
                          class={active ? 'cafeTab is-active' : 'cafeTab'}
                          onClick={() => setSelectedTipo(tipo)}
                          role="tab"
                          aria-selected={active}
                        >
                          {active ? (
                            <motion.span
                              class="cafeTabBubble"
                              layoutId="cafeTabBubble"
                              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30, mass: 1.15 }}
                            />
                          ) : null}
                          <span class="cafeTabLabel">{tipo}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {!hasContent ? (
                <div class="menuState">{t('cafes.empty')}</div>
              ) : (
                <div class="cafeList">
                  {items.map((item, idx) => {
                    const foto = fotoUrls.current[item.num] || null
                    return (
                      <article
                        class="cafeCardWrap"
                        key={item.num}
                        ref={register(item.num)}
                        data-item-num={item.num}
                      >
                        <motion.div
                          class="cafeCard"
                          initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.15 }}
                          transition={{
                            duration: reduceMotion ? 0 : 0.5,
                            ease: 'easeOut',
                            delay: reduceMotion ? 0 : Math.min(0.2, idx * 0.022),
                          }}
                        >
                          {item.has_foto ? (
                            <div class="cafePhoto" aria-hidden="true">
                              {foto ? (
                                <img src={foto} alt="" loading="lazy" decoding="async" />
                              ) : (
                                <div class="cafePhotoPlaceholder is-loading" />
                              )}
                            </div>
                          ) : null}

                          <div class="cafeContent">
                            {item.tipo && (
                              <div class="cafeMeta">{t(`cafe_type.${item.tipo}`) || item.tipo}</div>
                            )}
                            <h2 class="cafeName">{item.nombre}</h2>
                            {item.descripcion && item.nombre !== item.descripcion ? (
                              <p class="cafeDesc">{item.descripcion}</p>
                            ) : null}
                          </div>

                          <div class="cafePriceTag">
                            <span class="cafePriceAmount">{formatEuro(item.precio)}</span>
                          </div>
                        </motion.div>
                      </article>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
