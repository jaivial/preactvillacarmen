import { useEffect, useMemo, useState } from 'preact/hooks'
import { useI18n } from '../../lib/i18n'
import { isGroupMenuType, usePublicMenus } from '../../lib/publicMenus'
import type { PublicMenu, PublicMenuSection } from '../../lib/types'
import { formatEuro } from './MenuShared'

type NormalizedPrincipales = {
  title: string
  items: string[]
}

type NormalizedBeverage = {
  type: string
  pricePerPerson: number | null
}

type GroupMenuView = {
  id: number
  menuTitle: string
  subtitles: string[]
  entrantes: string[]
  principales: NormalizedPrincipales
  postres: string[]
  beverage: NormalizedBeverage
  comments: string[]
  priceValue: number | null
  priceLabel: string
  minPartySize: number
  includedCoffee: boolean
}

function asStringArray(v: unknown) {
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
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

function sectionDishes(section: PublicMenuSection): string[] {
  if (!Array.isArray(section.dishes)) return []
  return section.dishes
    .map((dish) => String(dish.title || '').trim())
    .filter(Boolean)
}

function sectionTitleIncludes(section: PublicMenuSection, term: string): boolean {
  return String(section.title || '')
    .trim()
    .toLowerCase()
    .includes(term)
}

function fallbackFromSections(menu: PublicMenu) {
  const starters: string[] = []
  const mains: string[] = []
  const desserts: string[] = []
  let mainsTitle = ''

  for (const section of menu.sections || []) {
    const dishes = sectionDishes(section)
    if (dishes.length === 0) continue
    const kind = String(section.kind || '').trim().toLowerCase()

    if (kind === 'entrantes' || sectionTitleIncludes(section, 'entrante')) {
      starters.push(...dishes)
      continue
    }
    if (kind === 'postres' || sectionTitleIncludes(section, 'postre')) {
      desserts.push(...dishes)
      continue
    }
    if (kind === 'principales') {
      if (!mainsTitle) mainsTitle = String(section.title || '').trim()
      mains.push(...dishes)
      continue
    }
  }

  return { starters, mains, mainsTitle, desserts }
}

function normalizeGroupMenu(menu: PublicMenu, fallbackMainsTitle: string): GroupMenuView {
  const subtitles = asStringArray(menu.menu_subtitle)
  const comments = asStringArray(menu.settings.comments)
  let entrantes = asStringArray(menu.entrantes)
  let postres = asStringArray(menu.postre)
  let principalesTitle = String(menu.principales.titulo_principales || '').trim() || fallbackMainsTitle
  let principalesItems = asStringArray(menu.principales.items)

  if (entrantes.length === 0 || principalesItems.length === 0 || postres.length === 0) {
    const fallback = fallbackFromSections(menu)
    if (entrantes.length === 0) entrantes = fallback.starters
    if (principalesItems.length === 0) principalesItems = fallback.mains
    if (!String(menu.principales.titulo_principales || '').trim() && fallback.mainsTitle) {
      principalesTitle = fallback.mainsTitle
    }
    if (postres.length === 0) postres = fallback.desserts
  }

  return {
    id: menu.id,
    menuTitle: menu.menu_title,
    subtitles,
    entrantes,
    principales: {
      title: principalesTitle,
      items: principalesItems,
    },
    postres,
    beverage: asBeverage(menu.settings.beverage),
    comments,
    priceValue: asNumberOrNull(menu.price),
    priceLabel: String(menu.price || '').trim(),
    minPartySize: Math.max(1, Number(menu.settings.min_party_size) || 8),
    includedCoffee: menu.settings.included_coffee === true,
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
  const publicMenus = usePublicMenus()
  const [active, setActive] = useState(0)

  const menus = useMemo(() => {
    if (!publicMenus) return null

    const groupMenus = publicMenus.filter((menu) => menu.active && isGroupMenuType(menu.menu_type))

    return groupMenus.map((menu) => normalizeGroupMenu(menu, t('menus.preview.mains')))
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
                      {menu.menuTitle}
                    </button>
                  ))}
                </div>
              ) : null}

              {current ? (
                <article class="menuSectionCard groupPanel" role={shouldShowTabs ? 'tabpanel' : undefined}>
                  <div class="menugrupos-decor">
                    <img class="menugrupos-flower-top-left" src="/media/menugrupos/pngegg.png" alt="" loading="lazy" />
                    <img class="menugrupos-flower-bottom-right" src="/media/menugrupos/pngegg2.png" alt="" loading="lazy" />
                    <img class="menugrupos-vine" src="/media/menugrupos/enredadera.png" alt="" loading="lazy" />
                  </div>
                  <h2 class="menuSectionTitle">{current.menuTitle}</h2>

                  {current.subtitles.length > 0 ? (
                    <div class="groupSubtitles">
                      {current.subtitles.map((subtitle, idx) => (
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
                    {current.entrantes.length > 0 ? (
                      <section class="menuSubSection">
                        <h3 class="menuSubTitle">{t('groupMenus.section.starters')}</h3>
                        <ul class="menuDishList">
                          {current.entrantes.map((item, idx) => (
                            <li class="menuDish" key={`${item}-${idx}`}>
                              <div class="menuDishText">{item}</div>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}

                    {current.principales.items.length > 0 ? (
                      <section class="menuSubSection">
                        <h3 class="menuSubTitle">{current.principales.title}</h3>
                        <ul class="menuDishList">
                          {current.principales.items.map((item, idx) => (
                            <li class="menuDish" key={`${item}-${idx}`}>
                              <div class="menuDishText">{item}</div>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}

                    {current.postres.length > 0 ? (
                      <section class="menuSubSection">
                        <h3 class="menuSubTitle">{t('groupMenus.section.dessert')}</h3>
                        <ul class="menuDishList">
                          {current.postres.map((item, idx) => (
                            <li class="menuDish" key={`${item}-${idx}`}>
                              <div class="menuDishText">{item}</div>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ) : null}

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
                        {current.comments.map((comment, idx) => (
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
