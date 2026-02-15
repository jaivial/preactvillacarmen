import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
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
  const [tipo, setTipo] = useState<WineType>('TINTO')
  const [vinos, setVinos] = useState<Vino[] | null | undefined>(undefined)
  const [fotoUrls, setFotoUrls] = useState<Record<number, string | null>>({})

  const seqRef = useRef(0)
  const vinosRef = useRef<Vino[]>([])
  const fotoUrlsRef = useRef<Record<number, string | null>>({})
  const inflightRef = useRef<Set<number>>(new Set())
  const orderRef = useRef<number[]>([])
  const indexRef = useRef<Map<number, number>>(new Map())

  const observerRef = useRef<IntersectionObserver | null>(null)
  const nodesRef = useRef<Map<number, HTMLElement>>(new Map())

  useEffect(() => {
    fotoUrlsRef.current = fotoUrls
  }, [fotoUrls])

  useEffect(() => {
    const nextSeq = seqRef.current + 1
    seqRef.current = nextSeq
    setVinos(undefined)
    setFotoUrls({})
    fotoUrlsRef.current = {}
    inflightRef.current.clear()

    apiGetJson<VinosResponse>(`/api/vinos?tipo=${encodeURIComponent(tipo)}&include_image=0`)
      .then((res) => {
        if (seqRef.current !== nextSeq) return
        const list = res.vinos || []
        vinosRef.current = list
        setVinos(list)
      })
      .catch(() => {
        if (seqRef.current !== nextSeq) return
        setVinos(null)
      })
  }, [tipo])

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

    const seq = seqRef.current
    inflightRef.current.add(num)

    apiGetJson<VinosResponse>(`/api/vinos?num=${encodeURIComponent(String(num))}&include_image=1`)
      .then((res) => {
        if (seqRef.current !== seq) return
        const url = res.vinos && res.vinos[0] && typeof res.vinos[0].foto_url === 'string' ? res.vinos[0].foto_url : null
        setFotoUrls((prev) => (num in prev ? prev : { ...prev, [num]: url }))
      })
      .catch(() => {
        if (seqRef.current !== seq) return
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
    <div class="page menuPage">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{t('nav.wines')}</h1>
          <p class="page-subtitle">{t('menu.wines.subtitle')}</p>

          <div class="wineFilters" role="tablist" aria-label={t('nav.wines')}>
            {WINE_TYPES.map((wt) => (
              <button
                key={wt.tipo}
                type="button"
                class={wt.tipo === tipo ? 'wineFilter active' : 'wineFilter'}
                onClick={() => setTipo(wt.tipo)}
                role="tab"
                aria-selected={wt.tipo === tipo}
              >
                {t(wt.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section class="menuBody">
        <div class="container">
          {vinos === undefined ? (
            <div class="menuState">{t('menus.preview.loading')}</div>
          ) : vinos === null ? (
            <div class="menuState">{t('wines.error')}</div>
          ) : !hasContent ? (
            <div class="menuState">{t('wines.empty')}</div>
          ) : (
            <div class="wineList">
              {vinos.map((v) => {
                const foto = fotoUrls[v.num]
                return (
                  <article class="wineCard" key={v.num} ref={register(v.num)} data-wine-num={v.num}>
                    <div class="wineMeta">{v.bodega}</div>
                    <h2 class="wineName">{v.nombre}</h2>

                    {v.denominacion_origen ? <div class="wineMinor">{`D.O. ${v.denominacion_origen}`}</div> : null}

                    {v.descripcion ? <p class="wineDesc">{v.descripcion}</p> : null}

                    <div class="wineFooter">
                      <div class="winePrice">{formatEuro(v.precio)}</div>
                      <div class="wineMinor">
                        {v.anyo ? <span>{v.anyo}</span> : null}
                        {v.graduacion ? <span>{`${v.graduacion}%`}</span> : null}
                      </div>
                    </div>

                    {v.has_foto ? (
                      foto === undefined ? (
                        <div class="wineMedia" aria-hidden="true">
                          <div class="wineMediaPlaceholder" />
                        </div>
                      ) : foto ? (
                        <div class="wineMedia" aria-hidden="true">
                          <img src={foto} alt="" loading="lazy" decoding="async" />
                        </div>
                      ) : null
                    ) : null}
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
