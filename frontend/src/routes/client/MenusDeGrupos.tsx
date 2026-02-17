import { useEffect, useMemo, useState } from 'preact/hooks'
import { useI18n } from '../../lib/i18n'
import { apiGetJson } from '../../lib/api'
import type { GroupMenuDisplay, GroupMenusDisplayResponse } from '../../lib/types'
import { formatEuro } from './MenuShared'

type NormalizedPrincipales = {
  title: string
  items: string[]
}

type NormalizedBeverage = {
  type: string
  pricePerPerson: number | null
}

function asStringArray(v: unknown) {
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
}

function asPrincipales(v: unknown, fallbackTitle: string): NormalizedPrincipales {
  if (!v || typeof v !== 'object') return { title: fallbackTitle, items: [] }
  const obj = v as any
  const title = typeof obj.titulo_principales === 'string' && obj.titulo_principales.trim() ? obj.titulo_principales.trim() : fallbackTitle
  const items = asStringArray(obj.items)
  return { title, items }
}

function asBeverage(v: unknown): NormalizedBeverage {
  if (!v || typeof v !== 'object') return { type: 'no_incluida', pricePerPerson: null }
  const obj = v as any
  const type = typeof obj.type === 'string' ? obj.type : 'no_incluida'
  const price = typeof obj.price_per_person === 'number' && Number.isFinite(obj.price_per_person) ? obj.price_per_person : null
  return { type, pricePerPerson: price }
}

function renderBeverageText(b: NormalizedBeverage, t: (key: string) => string) {
  if (!b || b.type === 'no_incluida') return null

  const price = b.pricePerPerson ?? 8
  const priceTag = `+${formatEuro(price)} ${t('groupMenus.beverage.pax')}`

  if (b.type === 'ilimitada') {
    return (
      <>
        <p class="menuDishText">{`${t('groupMenus.beverage.unlimited')} ${priceTag}`}</p>
        <p class="menuDishText menuMuted">{t('groupMenus.beverage.table')}</p>
        <p class="menuDishText menuMuted">{t('groupMenus.beverage.includes1')}</p>
        <p class="menuDishText menuMuted">{t('groupMenus.beverage.includes2')}</p>
      </>
    )
  }

  if (b.type === 'opcion') {
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
  const [menus, setMenus] = useState<GroupMenuDisplay[] | null | undefined>(undefined)
  const [active, setActive] = useState(0)
  const [showDetail, setShowDetail] = useState(false)

  const hasManyMenus = menus && menus.length > 2

  useEffect(() => {
    let cancelled = false
    apiGetJson<GroupMenusDisplayResponse>('/api/menuDeGruposBackend/getActiveMenusForDisplay.php')
      .then((res) => {
        if (cancelled) return
        const list = res.menus || []
        setMenus(list)
        setActive(0)
      })
      .catch(() => {
        if (cancelled) return
        setMenus(null)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const normalized = useMemo(() => {
    if (!menus) return null
    return menus.map((m) => {
      const subtitles = asStringArray(m.menu_subtitle)
      const entrantes = asStringArray(m.entrantes)
      const postres = asStringArray(m.postre)
      const comments = asStringArray(m.comments)
      const principales = asPrincipales(m.principales, t('menus.preview.mains'))
      const beverage = asBeverage(m.beverage)
      return { raw: m, subtitles, entrantes, principales, postres, beverage, comments }
    })
  }, [menus, t])

  const current = normalized && normalized[active] ? normalized[active] : null

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
          {menus === undefined ? (
            <div class="menuState">{t('menus.preview.loading')}</div>
          ) : menus === null ? (
            <div class="menuState">{t('menu.error')}</div>
          ) : menus.length === 0 ? (
            <div class="menuState">{t('groupMenus.empty')}</div>
          ) : hasManyMenus ? (
            showDetail && current ? (
              <>
                <button
                  type="button"
                  class="groupBackBtn"
                  onClick={() => setShowDetail(false)}
                  aria-label={t('common.back')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <article class="menuSectionCard groupPanel fade-in" role="tabpanel">
                  <div class="menugrupos-decor">
                    <img class="menugrupos-flower-top-left" src="/media/menugrupos/pngegg.png" alt="" loading="lazy" />
                    <img class="menugrupos-flower-bottom-right" src="/media/menugrupos/pngegg2.png" alt="" loading="lazy" />
                    <img class="menugrupos-vine" src="/media/menugrupos/enredadera.png" alt="" loading="lazy" />
                  </div>
                <h2 class="menuSectionTitle">{current.raw.menu_title}</h2>

                {current.subtitles.length > 0 ? (
                  <div class="groupSubtitles">
                    {current.subtitles.map((s, idx) => (
                      <p class="menuDishText menuMuted" key={`${s}-${idx}`}>
                        {s}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p class="menuDishText menuMuted">
                    {lang === 'es'
                      ? `(A partir de ${current.raw.min_party_size || 8} personas)`
                      : `(From ${current.raw.min_party_size || 8} people)`}
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
                    <div class="menuPrice">{`${formatEuro(current.raw.price)} / ${t('groupMenus.beverage.pax')}`}</div>
                    <p class="menuDishText menuMuted">
                      {current.raw.included_coffee ? t('groupMenus.coffee.included') : t('groupMenus.coffee.notIncluded')}
                    </p>
                  </section>

                  {current.comments.length > 0 ? (
                    <section class="menuSubSection">
                      <h3 class="menuSubTitle">{t('groupMenus.section.comments')}</h3>
                      {current.comments.map((c, idx) => (
                        <p class="menuDishText menuMuted" key={`${c}-${idx}`}>
                          {c}
                        </p>
                      ))}
                    </section>
                  ) : null}
                </div>
              </article>
            </>
            ) : (
              <div class="groupTabs groupTabs--column fade-in" role="tablist" aria-label={t('nav.groupMenus')}>
                {menus.map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    class={idx === active ? 'groupTab active' : 'groupTab'}
                    onClick={() => {
                      setActive(idx)
                      setShowDetail(true)
                    }}
                    role="tab"
                    aria-selected={idx === active}
                  >
                    {m.menu_title}
                  </button>
                ))}
              </div>
            )
          ) : (
            <>
              <div class="groupTabs" role="tablist" aria-label={t('nav.groupMenus')}>
                {menus.map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    class={idx === active ? 'groupTab active' : 'groupTab'}
                    onClick={() => setActive(idx)}
                    role="tab"
                    aria-selected={idx === active}
                  >
                    {m.menu_title}
                  </button>
                ))}
              </div>

              {current ? (
                <article class="menuSectionCard groupPanel" role="tabpanel">
                  <div class="menugrupos-decor">
                    <img class="menugrupos-flower-top-left" src="/media/menugrupos/pngegg.png" alt="" loading="lazy" />
                    <img class="menugrupos-flower-bottom-right" src="/media/menugrupos/pngegg2.png" alt="" loading="lazy" />
                    <img class="menugrupos-vine" src="/media/menugrupos/enredadera.png" alt="" loading="lazy" />
                  </div>
                  <h2 class="menuSectionTitle">{current.raw.menu_title}</h2>

                  {current.subtitles.length > 0 ? (
                    <div class="groupSubtitles">
                      {current.subtitles.map((s, idx) => (
                        <p class="menuDishText menuMuted" key={`${s}-${idx}`}>
                          {s}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p class="menuDishText menuMuted">
                      {lang === 'es'
                        ? `(A partir de ${current.raw.min_party_size || 8} personas)`
                        : `(From ${current.raw.min_party_size || 8} people)`}
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
                      <div class="menuPrice">{`${formatEuro(current.raw.price)} / ${t('groupMenus.beverage.pax')}`}</div>
                      <p class="menuDishText menuMuted">
                        {current.raw.included_coffee ? t('groupMenus.coffee.included') : t('groupMenus.coffee.notIncluded')}
                      </p>
                    </section>

                    {current.comments.length > 0 ? (
                      <section class="menuSubSection">
                        <h3 class="menuSubTitle">{t('groupMenus.section.comments')}</h3>
                        {current.comments.map((c, idx) => (
                          <p class="menuDishText menuMuted" key={`${c}-${idx}`}>
                            {c}
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
