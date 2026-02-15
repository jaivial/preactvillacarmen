import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { motion, useReducedMotion } from 'motion/react'
import { useI18n } from '../../lib/i18n'
import { apiGetJson } from '../../lib/api'
import type { Vino, VinosResponse } from '../../lib/types'
import { formatEuro } from './MenuShared'

type WineType = 'TINTO' | 'BLANCO' | 'CAVA'

const WINE_TYPES: { tipo: WineType; labelKey: string }[] = [
  { tipo: 'TINTO', labelKey: 'wines.type.tinto' },
  { tipo: 'BLANCO', labelKey: 'wines.type.blanco' },
  { tipo: 'CAVA', labelKey: 'wines.type.cava' },
]

export function Vinos() {
  const { t } = useI18n()
  const reduceMotion = useReducedMotion()
  const [tipo, setTipo] = useState<WineType>('TINTO')
  const [vinosByTipo, setVinosByTipo] = useState<Record<WineType, Vino[] | null | undefined>>(() => ({
    TINTO: undefined,
    BLANCO: undefined,
    CAVA: undefined,
  }))
  const [fotoUrls, setFotoUrls] = useState<Record<number, string | null>>({})

  const inflightListRef = useRef<Set<WineType>>(new Set())
  const vinosRef = useRef<Vino[]>([])
  const fotoUrlsRef = useRef<Record<number, string | null>>({})
  const inflightRef = useRef<Set<number>>(new Set())
  const orderRef = useRef<number[]>([])
  const indexRef = useRef<Map<number, number>>(new Map())

  const observerRef = useRef<IntersectionObserver | null>(null)
  const nodesRef = useRef<Map<number, HTMLElement>>(new Map())

  const vinos = vinosByTipo[tipo]

  useEffect(() => {
    fotoUrlsRef.current = fotoUrls
  }, [fotoUrls])

  useEffect(() => {
    if (vinosByTipo[tipo] !== undefined) return
    if (inflightListRef.current.has(tipo)) return

    let cancelled = false
    inflightListRef.current.add(tipo)

    apiGetJson<VinosResponse>(`/api/vinos?tipo=${encodeURIComponent(tipo)}&include_image=0`)
      .then((res) => {
        if (cancelled) return
        const list = res.vinos || []
        setVinosByTipo((prev) => ({ ...prev, [tipo]: list }))
      })
      .catch(() => {
        if (cancelled) return
        setVinosByTipo((prev) => ({ ...prev, [tipo]: null }))
      })
      .finally(() => {
        inflightListRef.current.delete(tipo)
      })

    return () => {
      cancelled = true
    }
  }, [tipo, vinosByTipo])

  useEffect(() => {
    const list = vinos || []
    orderRef.current = list.map((v) => v.num)
    indexRef.current = new Map(orderRef.current.map((num, idx) => [num, idx]))
    vinosRef.current = list
  }, [vinos])

  const ensureWine = useCallback((num: number) => {
    if (!Number.isFinite(num) || num <= 0) return
    if (num in fotoUrlsRef.current) return
    if (inflightRef.current.has(num)) return

    const wine = vinosRef.current.find((w) => w.num === num)
    if (!wine || !wine.has_foto) {
      setFotoUrls((prev) => (num in prev ? prev : { ...prev, [num]: null }))
      return
    }

    inflightRef.current.add(num)

    apiGetJson<VinosResponse>(`/api/vinos?num=${encodeURIComponent(String(num))}&include_image=1`)
      .then((res) => {
        const url = res.vinos && res.vinos[0] && typeof res.vinos[0].foto_url === 'string' ? res.vinos[0].foto_url : null
        setFotoUrls((prev) => (num in prev ? prev : { ...prev, [num]: url }))
      })
      .catch(() => {
        setFotoUrls((prev) => (num in prev ? prev : { ...prev, [num]: null }))
      })
      .finally(() => {
        inflightRef.current.delete(num)
      })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('IntersectionObserver' in window)) return

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target as HTMLElement
          const numRaw = el.getAttribute('data-wine-num') || ''
          const num = Number(numRaw)
          if (!Number.isFinite(num) || num <= 0) continue

          ensureWine(num)
          const idx = indexRef.current.get(num)
          if (idx !== undefined) {
            const nextNum = orderRef.current[idx + 1]
            if (typeof nextNum === 'number') ensureWine(nextNum)
          }

          obs.unobserve(entry.target)
        }
      },
      { rootMargin: '280px 0px', threshold: 0.15 }
    )
    observerRef.current = obs

    for (const el of nodesRef.current.values()) {
      obs.observe(el)
    }

    return () => {
      obs.disconnect()
      observerRef.current = null
    }
  }, [ensureWine])

  const register = useCallback((num: number) => {
    return (el: HTMLElement | null) => {
      const map = nodesRef.current
      const prev = map.get(num)
      if (prev && observerRef.current) observerRef.current.unobserve(prev)

      if (!el) {
        map.delete(num)
        return
      }

      map.set(num, el)
      if (observerRef.current) observerRef.current.observe(el)
    }
  }, [])

  const hasContent = useMemo(() => Array.isArray(vinos) && vinos.length > 0, [vinos])

  return (
    <div class="page menuPage winePage">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{t('nav.wines')}</h1>
          <p class="page-subtitle">{t('menu.wines.subtitle')}</p>
        </div>
      </section>

      <section class="menuBody wineBody">
        <div class="container">
          <div class="wineTabsSticky" role="tablist" aria-label={t('nav.wines')}>
            <div class="wineTabs">
              {WINE_TYPES.map((wt) => {
                const active = wt.tipo === tipo
                return (
                  <button
                    key={wt.tipo}
                    type="button"
                    class={active ? 'wineTab is-active' : 'wineTab'}
                    onClick={() => setTipo(wt.tipo)}
                    role="tab"
                    aria-selected={active}
                  >
                    {active ? (
                      <motion.span
                        class="wineTabBubble"
                        layoutId="wineTabBubble"
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 260, damping: 30, mass: 1.15 }
                        }
                      />
                    ) : null}
                    <span class="wineTabLabel">{t(wt.labelKey)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {vinos === undefined ? (
            <div class="menuState">{t('menus.preview.loading')}</div>
          ) : vinos === null ? (
            <div class="menuState">{t('wines.error')}</div>
          ) : !hasContent ? (
            <div class="menuState">{t('wines.empty')}</div>
          ) : (
            <div class="wineList">
              {vinos.map((v, idx) => {
                const foto = fotoUrls[v.num]
                return (
                  <article class="wineCardWrap" key={v.num} ref={register(v.num)} data-wine-num={v.num}>
                    <motion.div
                      class="wineCard"
                      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{
                        duration: reduceMotion ? 0 : 0.6,
                        ease: 'easeOut',
                        delay: reduceMotion ? 0 : Math.min(0.22, idx * 0.025),
                      }}
                    >
                      <div class="winePhoto" aria-hidden="true">
                        {v.has_foto && foto ? (
                          <img src={foto} alt="" loading="lazy" decoding="async" />
                        ) : (
                          <div class={v.has_foto && foto === undefined ? 'winePhotoPlaceholder is-loading' : 'winePhotoPlaceholder'} />
                        )}
                      </div>

                      <div class="wineInfo">
                        <div class="wineMeta">{v.bodega}</div>
                        <h2 class="wineName">{v.nombre}</h2>

                        {v.denominacion_origen ? <div class="wineOrigin">{`D.O. ${v.denominacion_origen}`}</div> : null}

                        {v.descripcion ? <p class="wineDesc">{v.descripcion}</p> : null}

                        <div class="wineFacts">
                          {v.anyo ? <span>{v.anyo}</span> : null}
                          {v.graduacion ? <span>{`${v.graduacion}%`}</span> : null}
                        </div>
                      </div>

                      <div class="winePriceTag" aria-label={t('menus.preview.price')}>
                        {formatEuro(v.precio)}
                      </div>
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
