import { useMemo } from 'preact/hooks'
import type { PublicMenu } from '../../lib/types'
import { useI18n } from '../../lib/i18n'
import { AllergensLegend, MenuHeroSlider, MenuPriceCard, MenuSection } from './MenuShared'
import { formatMenuPrice, splitClosedConventionalSections } from './menuPublicHelpers'

export function MenuCerradoConvencional(props: { menu: PublicMenu }) {
  const { t } = useI18n()
  const sectionData = useMemo(() => splitClosedConventionalSections(props.menu), [props.menu])
  const subtitle = useMemo(() => props.menu.menu_subtitle[0] || t('menus.card.daily.subtitle'), [props.menu.menu_subtitle, t])
  const price = useMemo(() => formatMenuPrice(props.menu.price), [props.menu.price])

  const hasContent = useMemo(
    () =>
      sectionData.starters.length > 0 ||
      sectionData.mains.length > 0 ||
      sectionData.rice.length > 0 ||
      sectionData.others.some((section) => section.dishes.length > 0),
    [sectionData],
  )

  return (
    <div class="page menuPage menuPage--closedConventional">
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
          <div class="menuMain">
            <MenuSection
              title={t('menus.preview.starters')}
              dishes={sectionData.starters}
              pickCategory="entrantes"
              showImage={props.menu.show_dish_images}
            />
            <MenuSection
              title={sectionData.mainsTitle || t('menus.preview.mains')}
              dishes={sectionData.mains}
              pickCategory="principales"
              showImage={props.menu.show_dish_images}
            />

            {sectionData.rice.length > 0 ? <p class="menuSectionLead">{t('menu.rice.lead')}</p> : null}

            <MenuSection
              title={t('menu.section.rice')}
              dishes={sectionData.rice}
              pickCategory="arroces"
              showImage={props.menu.show_dish_images}
              notes={[
                t('menu.rice.note1'),
                t('menu.rice.note2'),
                t('menu.rice.note3'),
                t('menu.rice.note4'),
              ]}
            />

            {sectionData.others.map((section) => (
              <MenuSection
                key={`${section.id}-${section.title}`}
                title={section.title}
                dishes={section.dishes}
                showImage={props.menu.show_dish_images}
              />
            ))}

            {!hasContent ? <div class="menuState">{t('menu.empty')}</div> : null}

            <MenuPriceCard precio={price} />
          </div>

          <AllergensLegend />
        </div>
      </section>
    </div>
  )
}
