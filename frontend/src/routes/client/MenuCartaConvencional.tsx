import { useMemo } from 'preact/hooks'
import type { PublicMenu } from '../../lib/types'
import { useI18n } from '../../lib/i18n'
import { AllergensLegend, GroupStyleDishSection, MenuHeroSlider } from './MenuShared'
import { getMenuViewSections } from './menuPublicHelpers'

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
  const comments = useMemo(() => props.menu.settings.comments || [], [props.menu.settings.comments])
  const infoLines = useMemo(() => [beverageNote(props.menu), ...comments].filter(Boolean), [comments, props.menu])

  return (
    <div class="page menuPage">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{props.menu.menu_title}</h1>
          <p class="page-subtitle">{subtitle}</p>
        </div>
      </section>

      <section class="menuHeroMedia">
        <div class="container">
          <MenuHeroSlider />
        </div>
      </section>

      <section class="menuBody">
        <div class="container">
          {sections.length === 0 ? (
            <div class="menuState">{t('menu.empty')}</div>
          ) : (
            <article class="menuSectionCard">
              <div class="menuGrid menuGrid--single">
                {sections.map((section) => (
                  <GroupStyleDishSection
                    key={`${section.id}-${section.title}`}
                    title={section.title}
                    dishes={section.dishes}
                    annotations={section.annotations}
                    showDishPrice={true}
                    showAllergens={true}
                  />
                ))}

                {infoLines.length > 0 ? (
                  <section class="menuSubSection">
                    <h3 class="menuSubTitle">Condiciones</h3>
                    {infoLines.map((line, index) => (
                      <p class="menuDishText menuMuted" key={`${line}-${index}`}>
                        {line}
                      </p>
                    ))}
                  </section>
                ) : null}
              </div>
            </article>
          )}

          <AllergensLegend />
        </div>
      </section>
    </div>
  )
}
