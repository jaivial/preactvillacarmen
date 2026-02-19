import { useMemo } from 'preact/hooks'
import type { PublicMenu } from '../../lib/types'
import { useI18n } from '../../lib/i18n'
import { AllergensLegend, MenuHeroSlider, MenuSection } from './MenuShared'
import { getMenuViewSections } from './menuPublicHelpers'

export function MenuEspecial(props: { menu: PublicMenu }) {
  const { t } = useI18n()
  const sections = useMemo(() => getMenuViewSections(props.menu), [props.menu])
  const subtitle = useMemo(() => props.menu.menu_subtitle[0] || 'Menu especial', [props.menu.menu_subtitle])
  const hasImage = useMemo(() => Boolean(String(props.menu.special_menu_image_url || '').trim()), [props.menu.special_menu_image_url])

  return (
    <div class="page menuPage">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{props.menu.menu_title}</h1>
          <p class="page-subtitle">{subtitle}</p>
        </div>
      </section>

      {hasImage ? (
        <section class="menuHeroMedia">
          <div class="container">
            <img
              class="menuHeroShot is-active is-reduced"
              src={props.menu.special_menu_image_url}
              alt={props.menu.menu_title}
              loading="eager"
              decoding="async"
            />
          </div>
        </section>
      ) : (
        <section class="menuHeroMedia">
          <div class="container">
            <MenuHeroSlider />
          </div>
        </section>
      )}

      <section class="menuBody">
        <div class="container">
          {sections.length === 0 ? (
            <div class="menuState">{t('menu.empty')}</div>
          ) : (
            <div class="menuMain">
              {sections.map((section) => (
                <MenuSection key={`${section.id}-${section.title}`} title={section.title} dishes={section.dishes} />
              ))}
            </div>
          )}

          <AllergensLegend />
        </div>
      </section>
    </div>
  )
}
