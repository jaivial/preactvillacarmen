import { useMemo } from 'preact/hooks'
import type { PublicMenu } from '../../lib/types'
import { useI18n } from '../../lib/i18n'
import { formatEuro } from './MenuShared'
import { getMenuViewSections } from './menuPublicHelpers'

function beverageText(menu: PublicMenu, t: (key: string) => string): string[] {
  const beverageType = String(menu.settings.beverage.type || 'no_incluida').toLowerCase().trim()
  if (beverageType === 'ilimitada') {
    return [
      `${t('groupMenus.beverage.unlimited')} +${formatEuro(Number(menu.settings.beverage.price_per_person || 8))} ${t('groupMenus.beverage.pax')}`,
      t('groupMenus.beverage.table'),
      t('groupMenus.beverage.includes1'),
      t('groupMenus.beverage.includes2'),
    ]
  }
  if (beverageType === 'opcion') {
    return [
      `${t('groupMenus.beverage.option')} +${formatEuro(Number(menu.settings.beverage.price_per_person || 8))} ${t('groupMenus.beverage.pax')}`,
      t('groupMenus.beverage.table'),
      t('groupMenus.beverage.includes1'),
      t('groupMenus.beverage.includes2'),
    ]
  }
  return [t('groupMenus.beverage.notIncluded')]
}

export function MenusDeGruposConvencional(props: { menu: PublicMenu }) {
  const { t, lang } = useI18n()
  const sections = useMemo(() => getMenuViewSections(props.menu), [props.menu])
  const subtitles = useMemo(() => props.menu.menu_subtitle || [], [props.menu.menu_subtitle])
  const beverageLines = useMemo(() => beverageText(props.menu, t), [props.menu, t])
  const comments = useMemo(() => props.menu.settings.comments || [], [props.menu.settings.comments])
  const priceValue = useMemo(() => Number(props.menu.price), [props.menu.price])

  return (
    <div class="page menuPage">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{props.menu.menu_title}</h1>
          <p class="page-subtitle">{t('menus.card.groups.subtitle')}</p>
        </div>
      </section>

      <section class="menuBody">
        <div class="container">
          <article class="menuSectionCard groupPanel">
            <div class="menugrupos-decor">
              <img class="menugrupos-flower-top-left" src="/media/menugrupos/pngegg.png" alt="" loading="lazy" />
              <img class="menugrupos-flower-bottom-right" src="/media/menugrupos/pngegg2.png" alt="" loading="lazy" />
              <img class="menugrupos-vine" src="/media/menugrupos/enredadera.png" alt="" loading="lazy" />
            </div>

            <h2 class="menuSectionTitle">{props.menu.menu_title}</h2>

            {subtitles.length > 0 ? (
              <div class="groupSubtitles">
                {subtitles.map((subtitle, idx) => (
                  <p class="menuDishText menuMuted" key={`${subtitle}-${idx}`}>
                    {subtitle}
                  </p>
                ))}
              </div>
            ) : (
              <p class="menuDishText menuMuted">
                {lang === 'es'
                  ? `(A partir de ${props.menu.settings.min_party_size || 8} personas)`
                  : `(From ${props.menu.settings.min_party_size || 8} people)`}
              </p>
            )}

            <div class="menuGrid menuGrid--single">
              {sections.map((section) => (
                <section class="menuSubSection" key={`${section.id}-${section.title}`}>
                  <h3 class="menuSubTitle">{section.title}</h3>
                  <ul class="menuDishList">
                    {section.dishes.map((dish, idx) => (
                      <li class="menuDish" key={`${section.id}-${idx}-${dish.descripcion}`}>
                        <div class="menuDishText">{dish.descripcion}</div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              <section class="menuSubSection">
                <h3 class="menuSubTitle">{t('groupMenus.section.beverages')}</h3>
                {beverageLines.map((line, idx) => (
                  <p class={idx === 0 ? 'menuDishText' : 'menuDishText menuMuted'} key={`${line}-${idx}`}>
                    {line}
                  </p>
                ))}
              </section>

              <section class="menuSubSection">
                <h3 class="menuSubTitle">{t('menus.preview.price')}</h3>
                <div class="menuPrice">
                  {Number.isFinite(priceValue) ? `${formatEuro(priceValue)} / ${t('groupMenus.beverage.pax')}` : props.menu.price}
                </div>
                <p class="menuDishText menuMuted">
                  {props.menu.settings.included_coffee ? t('groupMenus.coffee.included') : t('groupMenus.coffee.notIncluded')}
                </p>
              </section>

              {comments.length > 0 ? (
                <section class="menuSubSection">
                  <h3 class="menuSubTitle">{t('groupMenus.section.comments')}</h3>
                  {comments.map((comment, idx) => (
                    <p class="menuDishText menuMuted" key={`${comment}-${idx}`}>
                      {comment}
                    </p>
                  ))}
                </section>
              ) : null}
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
