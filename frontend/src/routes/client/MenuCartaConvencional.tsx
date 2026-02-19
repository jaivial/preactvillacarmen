import { useMemo } from 'preact/hooks'
import type { PublicMenu } from '../../lib/types'
import { useI18n } from '../../lib/i18n'
import { AllergensLegend, AllergenIcons } from './MenuShared'
import { formatMenuPrice, getMenuViewSections } from './menuPublicHelpers'

function renderDishPriceLabel(price: number | null) {
  if (price === null || !Number.isFinite(price)) return ''
  return `+${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}€`
}

function beverageNote(menu: PublicMenu): string {
  const beverageType = String(menu.settings.beverage.type || 'no_incluida').toLowerCase().trim()
  if (beverageType === 'ilimitada') return 'Bebida ilimitada'
  if (beverageType === 'opcion') return 'Opción de bebida ilimitada'
  return 'Bebida no incluida'
}

export function MenuCartaConvencional(props: { menu: PublicMenu }) {
  const { t } = useI18n()
  const subtitle = useMemo(() => props.menu.menu_subtitle[0] || 'Carta convencional', [props.menu.menu_subtitle])
  const sections = useMemo(() => getMenuViewSections(props.menu), [props.menu])
  const price = useMemo(() => formatMenuPrice(props.menu.price), [props.menu.price])
  const comments = useMemo(() => props.menu.settings.comments || [], [props.menu.settings.comments])

  return (
    <div class="page menuPage">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{props.menu.menu_title}</h1>
          <p class="page-subtitle">{subtitle}</p>
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
                    {section.dishes.map((dish, index) => (
                      <li class="menuDish" key={`${section.id}-${index}-${dish.descripcion}`}>
                        <div class="menuDishText">{dish.descripcion}</div>
                        <AllergenIcons alergenos={dish.alergenos} />
                        <div class="menuDishText menuMuted">{renderDishPriceLabel(props.menu.sections.find((row) => row.id === section.id)?.dishes[index]?.price || null)}</div>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}

              <article class="menuSectionCard menuSectionCard--price">
                <h2 class="menuSectionTitle">{t('menus.preview.price')}</h2>
                <p class="menuPrice">{price ? `${price}€` : '—'}</p>
                <p class="menuDishText menuMuted">{beverageNote(props.menu)}</p>
                {comments.map((comment, index) => (
                  <p class="menuDishText menuMuted" key={`${comment}-${index}`}>
                    {comment}
                  </p>
                ))}
              </article>
            </div>
          )}

          <AllergensLegend />
        </div>
      </section>
    </div>
  )
}
