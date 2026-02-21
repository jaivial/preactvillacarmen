import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { createPortal } from 'preact/compat'
import type { Dish } from '../../lib/types'
import { cdnUrl } from '../../lib/cdn'
import { useI18n } from '../../lib/i18n'
import { addMenuPickItem, type MenuPickCategory } from '../../lib/menuPick'
import { ChefHat, Plus } from 'lucide-react'

const ALLERGEN_LABELS: Record<string, { es: string; en: string }> = {
  Gluten: { es: 'Gluten', en: 'Gluten' },
  Crustaceos: { es: 'Crustáceos', en: 'Crustaceans' },
  Huevos: { es: 'Huevos', en: 'Eggs' },
  Pescado: { es: 'Pescado', en: 'Fish' },
  Cacahuetes: { es: 'Cacahuetes', en: 'Peanuts' },
  Soja: { es: 'Soja', en: 'Soy' },
  Leche: { es: 'Leche', en: 'Milk' },
  'Frutos de cascara': { es: 'Frutos de cáscara', en: 'Tree nuts' },
  Apio: { es: 'Apio', en: 'Celery' },
  Mostaza: { es: 'Mostaza', en: 'Mustard' },
  Sesamo: { es: 'Sésamo', en: 'Sesame' },
  Sulfitos: { es: 'Sulfitos', en: 'Sulfites' },
  Altramuces: { es: 'Altramuces', en: 'Lupin' },
  Moluscos: { es: 'Moluscos', en: 'Molluscs' },
}

const ALLERGEN_ICONS: Record<string, string> = {
  Gluten: '/images/gluten.png',
  Crustaceos: '/images/crustaceos.png',
  Huevos: '/images/huevos.png',
  Pescado: '/images/pescado.png',
  Cacahuetes: '/images/cacahuetes.png',
  Soja: '/images/soja.png',
  Leche: '/images/leche.png',
  'Frutos de cascara': '/images/frutoscascara.png',
  Apio: '/images/apio.png',
  Mostaza: '/images/mostaza.png',
  Sesamo: '/images/sesamo.png',
  Sulfitos: '/images/sulfitos.png',
  Altramuces: '/images/altramuces.png',
  Moluscos: '/images/moluscos.png',
}

const ALLERGEN_ORDER = [
  'Gluten',
  'Crustaceos',
  'Huevos',
  'Pescado',
  'Cacahuetes',
  'Soja',
  'Leche',
  'Frutos de cascara',
  'Apio',
  'Mostaza',
  'Sesamo',
  'Sulfitos',
  'Altramuces',
  'Moluscos',
] as const

const REVEAL_IO = {
  io: null as IntersectionObserver | null,
  handlers: new WeakMap<Element, () => void>(),
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return true
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function mediaSrc(path: string) {
  const src = String(path || '').trim()
  if (!src) return ''
  if (/^https?:\/\//i.test(src)) return src
  if (/^\/\//.test(src)) {
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:'
    return `${protocol}${src}`
  }
  if (/^(data:|blob:)/i.test(src)) return src
  return cdnUrl(src)
}

function observeRevealOnce(el: Element, onReveal: () => void) {
  if (typeof window === 'undefined') {
    onReveal()
    return () => {}
  }
  if (!('IntersectionObserver' in window)) {
    onReveal()
    return () => {}
  }

  if (!REVEAL_IO.io) {
    REVEAL_IO.io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const cb = REVEAL_IO.handlers.get(entry.target)
          if (cb) cb()
          REVEAL_IO.handlers.delete(entry.target)
          REVEAL_IO.io?.unobserve(entry.target)
        }
      },
      { threshold: 0.22, rootMargin: '0px 0px -10% 0px' }
    )
  }

  REVEAL_IO.handlers.set(el, onReveal)
  REVEAL_IO.io.observe(el)

  return () => {
    REVEAL_IO.handlers.delete(el)
    REVEAL_IO.io?.unobserve(el)
  }
}

function allergenLabel(raw: string, lang: 'es' | 'en') {
  const key = raw.trim()
  if (!key) return ''
  const entry = ALLERGEN_LABELS[key]
  if (!entry) return key
  return entry[lang] || entry.es
}

function normalizeAllergenKey(raw: string) {
  return raw.trim()
}

function dishDescriptionText(dish: Dish): string {
  return String(dish.description || '').trim()
}

function dishSupplementText(dish: Dish): string {
  if (dish.supplement_enabled !== true) return ''
  if (typeof dish.supplement_price === 'number' && Number.isFinite(dish.supplement_price)) {
    return `Suplemento +${formatEuro(dish.supplement_price)}`
  }
  return 'Suplemento'
}

export function AllergenIcons(props: { alergenos: string[] }) {
  const { t, lang } = useI18n()
  const keys = Array.from(
    new Set((props.alergenos || []).map(normalizeAllergenKey).filter((k) => k && Boolean(ALLERGEN_ICONS[k]))),
  )

  if (keys.length === 0) return null

  return (
    <div class="dishAllergenRow" aria-label={t('menu.allergens.aria')}>
      {keys.map((key) => {
        const src = ALLERGEN_ICONS[key]
        const label = allergenLabel(key, lang)
        return (
          <img
            key={key}
            src={src}
            class="allergenIcon"
            alt={label}
            title={label}
            loading="lazy"
            decoding="async"
          />
        )
      })}
    </div>
  )
}

function DishCard(props: { dish: Dish; pickCategory?: MenuPickCategory; showImage?: boolean }) {
  const { t } = useI18n()
  const ref = useRef<HTMLLIElement>(null)
  const [revealed, setRevealed] = useState(() => prefersReducedMotion())
  const [imageErrored, setImageErrored] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const showImage = props.showImage === true
  const rawImage = String(props.dish.image_url || props.dish.foto_url || '').trim()
  const hasImage = Boolean(rawImage)
  const imageSource = useMemo(() => (hasImage ? mediaSrc(rawImage) : ''), [rawImage, hasImage])
  const descriptionText = useMemo(() => dishDescriptionText(props.dish), [props.dish])
  const supplementText = useMemo(() => dishSupplementText(props.dish), [props.dish])

  useEffect(() => {
    setImageErrored(false)
  }, [rawImage, showImage])

  useEffect(() => {
    if (!lightboxOpen) return
    const cls = 'vc-modal-open'
    document.body.classList.add(cls)
    return () => document.body.classList.remove(cls)
  }, [lightboxOpen])

  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxOpen])

  useEffect(() => {
    if (revealed) return
    if (prefersReducedMotion()) {
      setRevealed(true)
      return
    }
    const el = ref.current
    if (!el) return
    return observeRevealOnce(el, () => setRevealed(true))
  }, [revealed])

  let cls = revealed ? 'dishCard is-revealed' : 'dishCard'
  if (props.pickCategory) cls += ' dishCard--pickable'
  if (showImage) cls += ' dishCard--withImage'

  return (
    <li ref={ref} class={cls}>
      {showImage ? (
        <div class="dishCardMain">
          <div class={`dishCardMedia ${hasImage && !imageErrored ? '' : 'is-fallback'}`}>
            {hasImage && !imageErrored ? (
              <button
                type="button"
                class="dishCardMediaBtn"
                aria-label={`Ver imagen de ${props.dish.descripcion}`}
                onClick={() => setLightboxOpen(true)}
              >
                <img
                  class="dishCardMediaImage"
                  src={imageSource}
                  alt={props.dish.descripcion}
                  onError={() => setImageErrored(true)}
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ) : (
              <div class="dishCardMediaFallback" aria-label={t('menu.image.placeholder')}>
                <ChefHat class="lucide lucide-chef-hat-icon lucide-chef-hat" aria-hidden="true" />
              </div>
            )}
          </div>
          <div class="dishCardInfo">
            <div class="dishCardBody">
              <div class="dishDescription">{props.dish.descripcion}</div>
              {descriptionText ? <div class="dishDescriptionExtra">{descriptionText}</div> : null}
              {supplementText ? <div class="dishSupplementInfo">{supplementText}</div> : null}
            </div>
            <AllergenIcons alergenos={props.dish.alergenos} />
          </div>
        </div>
      ) : (
        <div class="dishCardBody">
          <div class="dishDescription">{props.dish.descripcion}</div>
          {descriptionText ? <div class="dishDescriptionExtra">{descriptionText}</div> : null}
          {supplementText ? <div class="dishSupplementInfo">{supplementText}</div> : null}
          <AllergenIcons alergenos={props.dish.alergenos} />
        </div>
      )}

      {props.pickCategory ? (
        <button
          type="button"
          class="dishAddBtn"
          aria-label={t('menu.pick.add')}
          title={t('menu.pick.add')}
          onClick={() => addMenuPickItem(props.pickCategory!, props.dish.descripcion)}
        >
          <Plus className="dishAddIcon" aria-hidden="true" />
        </button>
      ) : null}

      {lightboxOpen
        ? (typeof document === 'undefined'
            ? (
                <div
                  class="vc-menuLightbox"
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Imagen de ${props.dish.descripcion}`}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setLightboxOpen(false)
                  }}
                >
                  <button
                    type="button"
                    class="vc-menuLightboxClose"
                    aria-label="Cerrar"
                    onClick={() => setLightboxOpen(false)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                  <div class="vc-menuLightboxContent" onClick={(e) => e.stopPropagation()}>
                    <img
                      src={imageSource}
                      alt={props.dish.descripcion}
                      class="vc-menuLightboxImg"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                </div>
              )
            : createPortal(
                <div
                  class="vc-menuLightbox"
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Imagen de ${props.dish.descripcion}`}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) setLightboxOpen(false)
                  }}
                >
                  <button
                    type="button"
                    class="vc-menuLightboxClose"
                    aria-label="Cerrar"
                    onClick={() => setLightboxOpen(false)}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                  <div class="vc-menuLightboxContent" onClick={(e) => e.stopPropagation()}>
                    <img
                      src={imageSource}
                      alt={props.dish.descripcion}
                      class="vc-menuLightboxImg"
                      loading="eager"
                      decoding="async"
                    />
                  </div>
                </div>,
                document.body,
              ))
        : null}
    </li>
  )
}

export function DishCardGrid(props: { dishes: Dish[]; pickCategory?: MenuPickCategory }) {
  const items = props.dishes || []
  if (items.length === 0) return null

  return (
    <ul class="dishGrid" role="list">
      {items.map((dish, idx) => (
        <DishCard dish={dish} pickCategory={props.pickCategory} key={`${dish.descripcion}-${idx}`} />
      ))}
    </ul>
  )
}

export function DishCardGridWithImage(props: { dishes: Dish[]; pickCategory?: MenuPickCategory; showImage?: boolean }) {
  const items = props.dishes || []
  if (items.length === 0) return null

  return (
    <ul class="dishGrid" role="list">
      {items.map((dish, idx) => (
        <DishCard
          dish={dish}
          pickCategory={props.pickCategory}
          showImage={props.showImage}
          key={`${dish.descripcion}-${idx}-${props.showImage ? 'with-image' : 'without-image'}`}
        />
      ))}
    </ul>
  )
}

export function MenuSection(props: {
  title: string
  dishes: Dish[]
  notes?: string[]
  pickCategory?: MenuPickCategory
  showImage?: boolean
}) {
  const items = props.dishes || []
  if (items.length === 0) return null

  return (
    <section class="menuSection">
      <h2 class="menuSectionHeading">{props.title}</h2>
      {props.showImage ? (
        <DishCardGridWithImage dishes={items} pickCategory={props.pickCategory} showImage={props.showImage} />
      ) : (
        <DishCardGrid dishes={items} pickCategory={props.pickCategory} />
      )}
      {props.notes && props.notes.length > 0 ? (
        <ul class="menuSectionNotes" role="list">
          {props.notes.map((note, idx) => (
            <li class="menuSectionNote" key={`${note}-${idx}`}>
              {note}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

export function MenuPriceCard(props: { precio: string }) {
  const { t } = useI18n()

  return (
    <section class="menuAsideCard">
      <h2 class="menuAsideTitle">{t('menus.preview.price')}</h2>

      <div class="menuPriceNotes">
        <div class="menuPriceNote">{t('menu.price.dessertOrCoffee')}</div>
        <div class="menuPriceNote">({t('menu.price.drinkNotIncluded')})</div>
      </div>

      <div class="menuPriceValue">{props.precio ? `${props.precio} €` : '—'}</div>

      <div class="menuImportantBox">
        <h3 class="menuImportantTitle">{t('menu.important.title')}</h3>
        <p class="menuImportantText">{t('menu.important.minConsumption')}</p>
        <p class="menuImportantText">{t('menu.important.noKidsMenu')}</p>
        <p class="menuImportantText menuImportantText--takeaway">{t('menu.takeaway.note')}</p>
      </div>
    </section>
  )
}

export function AllergensLegend() {
  const { t, lang } = useI18n()

  return (
    <section class="allergensLegend" aria-label={t('menu.allergens.legend.title')}>
      <h2 class="allergensLegendTitle">{t('menu.allergens.legend.title')}</h2>
      <div class="allergensLegendGrid">
        {ALLERGEN_ORDER.map((key) => {
          const src = ALLERGEN_ICONS[key]
          const label = allergenLabel(key, lang)
          if (!src) return null
          return (
            <div class="allergensLegendItem" key={key}>
              <img src={src} class="allergenIcon" alt={label} loading="lazy" decoding="async" />
              <span class="allergensLegendLabel">{label}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function MenuHeroSlider() {
  const { t } = useI18n()
  const reduced = prefersReducedMotion()

  const paths = useMemo(
    () => [
      'https://villacarmenmedia.b-cdn.net/images/comida/9%3A16/ChatGPT%20Image%2017%20feb%202026%2C%2002_28_04%20%281%29.webp',
      'https://villacarmenmedia.b-cdn.net/images/comida/9%3A16/ChatGPT%20Image%2017%20feb%202026%2C%2002_32_50.webp',
      'https://villacarmenmedia.b-cdn.net/images/comida/9%3A16/comid9_16_4.webp',
      'https://villacarmenmedia.b-cdn.net/images/comida/9%3A16/comida9_16_2.webp',
      'https://villacarmenmedia.b-cdn.net/images/comida/9%3A16/croquetas9_16.webp',
    ],
    []
  )

  const [active, setActive] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)
  const [bad, setBad] = useState<Record<number, true>>({})
  const badRef = useRef(bad)

  useEffect(() => {
    badRef.current = bad
  }, [bad])

  const findNextIndex = (from: number) => {
    if (paths.length <= 1) return from
    const badMap = badRef.current
    for (let step = 1; step <= paths.length; step++) {
      const idx = (from + step) % paths.length
      if (!badMap[idx]) return idx
    }
    return from
  }

  const advance = () => {
    const next = findNextIndex(active)
    if (next === active) return
    setPrev(active)
    setActive(next)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (reduced) return
    if (paths.length <= 1) return
    const id = window.setInterval(advance, 3500)
    return () => window.clearInterval(id)
  }, [active, paths.length, reduced])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (prev === null) return
    const id = window.setTimeout(() => setPrev(null), 1100)
    return () => window.clearTimeout(id)
  }, [prev])

  // Preload the next image (best-effort) to reduce blank frames on slow connections.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (paths.length <= 1) return
    const next = findNextIndex(active)
    if (next === active) return
    const url = mediaSrc(paths[next])
    const img = new Image()
    img.decoding = 'async'
    img.src = url
  }, [active, paths.length])

  const onError = (idx: number) => {
    setBad((prevBad) => (prevBad[idx] ? prevBad : { ...prevBad, [idx]: true }))
    if (idx === active) {
      const next = findNextIndex(active)
      if (next !== active) {
        setPrev(active)
        setActive(next)
      }
    }
  }

  return (
    <div class="menuHeroSlider" aria-label={t('menu.slider.aria')}>
      <div class="menuHeroSliderStage" aria-hidden="true">
        {prev !== null && !bad[prev] ? (
          <img
            key={`prev-${paths[prev]}`}
            src={mediaSrc(paths[prev])}
            alt=""
            class="menuHeroShot is-prev"
            loading="eager"
            decoding="async"
            onError={() => onError(prev)}
          />
        ) : null}

        {!bad[active] ? (
          <img
            key={`active-${paths[active]}`}
            src={mediaSrc(paths[active])}
            alt=""
            class={reduced ? 'menuHeroShot is-active is-reduced' : 'menuHeroShot is-active'}
            loading="eager"
            decoding="async"
            onError={() => onError(active)}
          />
        ) : null}
      </div>
    </div>
  )
}

export function DishList(props: { dishes: Dish[] }) {
  const items = props.dishes || []
  if (items.length === 0) return null

  return (
    <ul class="menuDishList">
      {items.map((dish, idx) => (
        <li class="menuDish" key={`${dish.descripcion}-${idx}`}>
          <div class="menuDishText">{dish.descripcion}</div>
          <AllergenIcons alergenos={dish.alergenos} />
        </li>
      ))}
    </ul>
  )
}

export function formatEuro(value: number) {
  if (!Number.isFinite(value)) return ''
  const rounded = Math.round(value * 100) / 100
  const out = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2)
  return `${out}€`
}
