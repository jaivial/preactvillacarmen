import { useEffect, useMemo, useState } from 'preact/hooks'
import { useI18n, localizedArray } from '../../lib/i18n'
import { apiGetJson } from '../../lib/api'
import type { Dish } from '../../lib/types'
import { formatEuro, MenuSection } from './MenuShared'

type GroupMenuDishValue = {
  id?: unknown
  nombre?: unknown
  descripcion?: unknown
  suplemento?: unknown
  suplemento_activo?: unknown
  active?: unknown
  alergenos?: unknown
}

type GroupMenuApi = {
  id: number
  menu_title: string
  menu_title_english?: string
  price: number | string
  included_coffee: boolean
  menu_subtitle: unknown
  menu_subtitle_english?: unknown
  entrantes: unknown
  principales: unknown
  postre: unknown
  beverage: unknown
  comments: unknown
  comments_english?: unknown
  min_party_size: number
}

type GroupMenusApiResponse = {
  success: boolean
  menus: GroupMenuApi[]
}

type NormalizedPrincipales = {
  title: string
  items: Dish[]
}

type NormalizedBeverage = {
  type: string
  pricePerPerson: number | null
}

type GroupMenuView = {
  id: number
  menuTitle: string
  menuTitleEnglish: string
  subtitles: string[]
  subtitlesEnglish: string[]
  entrantes: Dish[]
  principales: NormalizedPrincipales
  postres: Dish[]
  beverage: NormalizedBeverage
  comments: string[]
  commentsEnglish: string[]
  priceValue: number | null
  priceLabel: string
  minPartySize: number
  includedCoffee: boolean
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
}

function asDishes(v: unknown): Dish[] {
  if (!Array.isArray(v)) return []
  return v
    .map((value): Dish | null => {
      if (typeof value === 'string') {
        const descripcion = value.trim()
        return descripcion ? { descripcion, alergenos: [], active: true } : null
      }
      if (!value || typeof value !== 'object') return null
      const item = value as GroupMenuDishValue
      const nombre = String(item.nombre ?? '').trim()
      if (!nombre) return null
      const suplemento = asNumberOrNull(item.suplemento)
      const alergenos = asStringArray(item.alergenos)
      return {
        descripcion: nombre,
        description: String(item.descripcion ?? '').trim() || null,
        alergenos,
        supplement_enabled: item.suplemento_activo === true || suplemento !== null,
        supplement_price: suplemento,
        active: item.active !== false && item.active !== 0 && item.active !== '0',
      }
    })
    .filter((dish): dish is Dish => Boolean(dish && dish.active !== false))
}

function asPrincipales(v: unknown): { title: string; items: Dish[] } {
  if (!v || typeof v !== 'object') return { title: '', items: [] }
  const obj = v as Record<string, unknown>
  return {
    title: String(obj.titulo_principales ?? '').trim(),
    items: asDishes(obj.items),
  }
}

function asNumberOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const parsed = Number(v.trim().replace(',', '.'))
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function asBeverage(v: unknown): NormalizedBeverage {
  if (!v || typeof v !== 'object') return { type: 'no_incluida', pricePerPerson: null }
  const obj = v as Record<string, unknown>
  const type = typeof obj.type === 'string' ? obj.type : 'no_incluida'
  return { type, pricePerPerson: asNumberOrNull(obj.price_per_person) }
}

function normalizeGroupMenu(menu: GroupMenuApi, fallbackMainsTitle: string): GroupMenuView {
  const principais = asPrincipales(menu.principales)
  return {
    id: menu.id,
    menuTitle: menu.menu_title,
    menuTitleEnglish: String(menu.menu_title_english || '').trim(),
    subtitles: asStringArray(menu.menu_subtitle),
    subtitlesEnglish: asStringArray(menu.menu_subtitle_english),
    entrantes: asDishes(menu.entrantes),
    principales: {
      title: principais.title || fallbackMainsTitle,
      items: principais.items,
    },
    postres: asDishes(menu.postre),
    beverage: asBeverage(menu.beverage),
    comments: asStringArray(menu.comments),
    commentsEnglish: asStringArray(menu.comments_english),
    priceValue: asNumberOrNull(menu.price),
    priceLabel: String(menu.price || '').trim(),
    minPartySize: Math.max(1, Number(menu.min_party_size) || 8),
    includedCoffee: menu.included_coffee === true,
  }
}

function renderBeverageText(beverage: NormalizedBeverage, t: (key: string) => string) {
  if (!beverage || beverage.type === 'no_incluida') return null

  const price = beverage.pricePerPerson ?? 8
  const priceTag = `+${formatEuro(price)} ${t('groupMenus.beverage.pax')}`

  if (beverage.type === 'ilimitada') {
    return (
      <>
        <p class="menuDishText">{`${t('groupMenus.beverage.unlimited')} ${priceTag}`}</p>
        <p class="menuDishText menuMuted">{t('groupMenus.beverage.table')}</p>
        <p class="menuDishText menuMuted">{t('groupMenus.beverage.includes1')}</p>
        <p class="menuDishText menuMuted">{t('groupMenus.beverage.includes2')}</p>
      </>
    )
  }

  if (beverage.type === 'opcion') {
    return (
      <>
        <p class="menuDishText">{`${t('groupMenus.beverage.option')} ${priceTag}`}</p>
        <p class="menuDishText menuMuted">{t('groupMenus.beverage.table')}</p>
        <p class="menuDishText menuMuted">{t('groupMenus.beverage.includes1')}</p>
        <p class="menuDishText menuMuted">{t('groupMenus.beverage.includes2')}</p>
      </>
    )
  }

  return <p class="menuDishText">{t('groupMenus.beverage.notIncluded')}</p>
}

export function MenusDeGrupos() {
  const { t, lang } = useI18n()
  const [publicMenus, setPublicMenus] = useState<GroupMenuApi[] | null | undefined>(undefined)
  const [active, setActive] = useState(0)

  useEffect(() => {
    let cancelled = false
    apiGetJson<GroupMenusApiResponse>('/api/menuDeGruposBackend/getActiveMenusForDisplay')
      .then((data) => {
        if (!cancelled) setPublicMenus(data.success ? data.menus : null)
      })
      .catch(() => {
        if (!cancelled) setPublicMenus(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const menus = useMemo(() => {
    if (!publicMenus) return null

    return publicMenus.map((menu) => normalizeGroupMenu(menu, t('menus.preview.mains')))
  }, [publicMenus, t])

  useEffect(() => {
    setActive(0)
  }, [menus?.length])

  const shouldShowTabs = Boolean(menus && menus.length >= 2)
  const current = useMemo(() => {
    if (!menus || menus.length === 0) return null
    return menus[active] || menus[0]
  }, [active, menus])

  const formattedPrice = useMemo(() => {
    if (!current) return ''
    if (current.priceValue !== null) return `${formatEuro(current.priceValue)} / ${t('groupMenus.beverage.pax')}`
    if (current.priceLabel) return `${current.priceLabel} / ${t('groupMenus.beverage.pax')}`
    return ''
  }, [current, t])

  return (
    <div class="page menuPage">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{t('nav.groupMenus')}</h1>
          <p class="page-subtitle">{t('menus.card.groups.subtitle')}</p>
        </div>
      </section>

      <section class="menuBody">
        <div class="container">
          {publicMenus === undefined ? (
            <div class="menuState">{t('menus.preview.loading')}</div>
          ) : publicMenus === null ? (
            <div class="menuState">{t('menu.error')}</div>
          ) : !menus || menus.length === 0 ? (
            <div class="menuState">{t('groupMenus.empty')}</div>
          ) : (
            <>
              {shouldShowTabs ? (
                <div class="groupTabs" role="tablist" aria-label={t('nav.groupMenus')}>
                  {menus.map((menu, idx) => (
                    <button
                      key={menu.id}
                      type="button"
                      class={idx === active ? 'groupTab active' : 'groupTab'}
                      onClick={() => setActive(idx)}
                      role="tab"
                      aria-selected={idx === active}
                    >
                      {lang === 'en' && menu.menuTitleEnglish ? menu.menuTitleEnglish : menu.menuTitle}
                    </button>
                  ))}
                </div>
              ) : null}

              {current ? (
                <article class="menuSectionCard groupPanel groupPanel--plain" role={shouldShowTabs ? 'tabpanel' : undefined}>
                  <div class="menugrupos-decor">
                    <img class="menugrupos-flower-top-left" src="/media/menugrupos/pngegg.png" alt="" loading="lazy" />
                    <img class="menugrupos-flower-bottom-right" src="/media/menugrupos/pngegg2.png" alt="" loading="lazy" />
                    <img class="menugrupos-vine" src="/media/menugrupos/enredadera.png" alt="" loading="lazy" />
                  </div>
                  <h2 class="menuSectionTitle">{lang === 'en' && current.menuTitleEnglish ? current.menuTitleEnglish : current.menuTitle}</h2>

                  {current.subtitles.length > 0 ? (
                    <div class="groupSubtitles">
                      {localizedArray(current.subtitles, current.subtitlesEnglish, lang).map((subtitle, idx) => (
                        <p class="menuDishText menuMuted" key={`${subtitle}-${idx}`}>
                          {subtitle}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p class="menuDishText menuMuted">
                      {lang === 'es'
                        ? `(A partir de ${current.minPartySize} personas)`
                        : `(From ${current.minPartySize} people)`}
                    </p>
                  )}

                  <div class="menuGrid menuGrid--single">
                    <MenuSection title={t('groupMenus.section.starters')} dishes={current.entrantes} />
                    <MenuSection title={current.principales.title} dishes={current.principales.items} />
                    <MenuSection title={t('groupMenus.section.dessert')} dishes={current.postres} />

                    {current.beverage.type !== 'no_incluida' ? (
                      <section class="menuSubSection">
                        <h3 class="menuSubTitle">{t('groupMenus.section.beverages')}</h3>
                        {renderBeverageText(current.beverage, t)}
                      </section>
                    ) : null}

                    <section class="menuSubSection">
                      <h3 class="menuSubTitle">{t('menus.preview.price')}</h3>
                      <div class="menuPrice">{formattedPrice}</div>
                      <p class="menuDishText menuMuted">
                        {current.includedCoffee ? t('groupMenus.coffee.included') : t('groupMenus.coffee.notIncluded')}
                      </p>
                    </section>

                    {current.comments.length > 0 ? (
                      <section class="menuSubSection">
                        <h3 class="menuSubTitle">{t('groupMenus.section.comments')}</h3>
                        {localizedArray(current.comments, current.commentsEnglish, lang).map((comment, idx) => (
                          <p class="menuDishText menuMuted" key={`${comment}-${idx}`}>
                            {comment}
                          </p>
                        ))}
                      </section>
                    ) : null}
                  </div>
                </article>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
