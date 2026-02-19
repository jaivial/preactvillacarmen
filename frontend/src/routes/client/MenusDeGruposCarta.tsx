import { useMemo } from 'preact/hooks'
import type { PublicMenu } from '../../lib/types'
import { useI18n } from '../../lib/i18n'
import { formatEuro } from './MenuShared'
import { getMenuViewSections } from './menuPublicHelpers'

function groupCartaBeverage(menu: PublicMenu): string {
  const beverageType = String(menu.settings.beverage.type || 'no_incluida').toLowerCase().trim()
  if (beverageType === 'ilimitada') return 'Bebida ilimitada'
  if (beverageType === 'opcion') return 'Opción de bebida ilimitada'
  return 'Bebida no incluida'
}

export function MenusDeGruposCarta(props: { menu: PublicMenu }) {
  const { t } = useI18n()
  const sections = useMemo(() => getMenuViewSections(props.menu), [props.menu])
  const subtitles = useMemo(() => props.menu.menu_subtitle || [], [props.menu.menu_subtitle])
  const comments = useMemo(() => props.menu.settings.comments || [], [props.menu.settings.comments])
  const price = useMemo(() => Number(props.menu.price), [props.menu.price])
  const beverage = useMemo(() => groupCartaBeverage(props.menu), [props.menu])

  return (
    <div class="page menuPage">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{props.menu.menu_title}</h1>
          <p class="page-subtitle">{subtitles[0] || 'Menu de grupos a la carta'}</p>
        </div>
      </section>

      <section class="menuBody">
        <div class="container">
          {sections.length === 0 ? (
            <div class="menuState">{t('menu.empty')}</div>
          ) : (
            <div class="menuGrid">
              {sections.map((section) => (
                <article class="menuSectionCard" key={`${section.id}-${section.title}`}>
                  <h2 class="menuSectionTitle">{section.title}</h2>
                  <ul class="menuDishList">
                    {section.dishes.map((dish, idx) => (
                      <li class="menuDish" key={`${section.id}-${idx}-${dish.descripcion}`}>
                        <div class="menuDishText">{dish.descripcion}</div>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}

              <article class="menuSectionCard menuSectionCard--price">
                <h2 class="menuSectionTitle">{t('menus.preview.price')}</h2>
                <p class="menuPrice">{Number.isFinite(price) ? `${formatEuro(price)} / ${t('groupMenus.beverage.pax')}` : props.menu.price}</p>
                <p class="menuDishText menuMuted">{beverage}</p>
                <p class="menuDishText menuMuted">
                  {props.menu.settings.included_coffee ? t('groupMenus.coffee.included') : t('groupMenus.coffee.notIncluded')}
                </p>
                {comments.map((comment, idx) => (
                  <p class="menuDishText menuMuted" key={`${comment}-${idx}`}>
                    {comment}
                  </p>
                ))}
              </article>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
