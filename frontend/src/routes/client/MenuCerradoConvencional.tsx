import { useMemo } from 'preact/hooks'
import type { PublicMenu } from '../../lib/types'
import { localized, localizedArray, useI18n } from '../../lib/i18n'
import { AllergensLegend, MenuHeroSlider, MenuPriceCard, MenuSection } from './MenuShared'
import { formatMenuPrice, splitClosedConventionalSections } from './menuPublicHelpers'

export function MenuCerradoConvencional(props: { menu: PublicMenu }) {
  const { t, lang } = useI18n()
  const sectionData = useMemo(() => splitClosedConventionalSections(props.menu), [props.menu])
  const subtitle = useMemo(
    () => localizedArray(props.menu.menu_subtitle, props.menu.menu_subtitle_english, lang)[0] || t('menus.card.daily.subtitle'),
    [lang, props.menu.menu_subtitle, props.menu.menu_subtitle_english, t],
  )
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
          <h1 class="page-title">{localized(props.menu.menu_title, props.menu.menu_title_english, lang)}</h1>
          <p class="page-subtitle">{subtitle}</p>
        </div>
      </section>

      <section class="menuHeroMedia">
        <div class="container">
          <MenuHeroSlider images={props.menu.slider_images} hidden={props.menu.slider_mode === 'hidden'} />
        </div>
      </section>

      <section class="menuBody">
        <div class="container">
          <div class="menuMain">
            <MenuSection
              title={t('menus.preview.starters')}
              dishes={sectionData.starters}
              annotations={localizedArray(sectionData.starterAnnotations, sectionData.starterAnnotationsEnglish, lang)}
              pickCategory="entrantes"
              showImage={props.menu.show_dish_images}
            />
            <MenuSection
              title={localized(sectionData.mainsTitle || t('menus.preview.mains'), sectionData.mainsTitleEnglish, lang)}
              dishes={sectionData.mains}
              annotations={localizedArray(sectionData.mainsAnnotations, sectionData.mainsAnnotationsEnglish, lang)}
              pickCategory="principales"
              showImage={props.menu.show_dish_images}
            />

            {sectionData.rice.length > 0 ? <p class="menuSectionLead">{t('menu.rice.lead')}</p> : null}

            <MenuSection
              title={localized(sectionData.riceTitle || t('menu.section.rice'), sectionData.riceTitleEnglish, lang)}
              dishes={sectionData.rice}
              annotations={localizedArray(sectionData.riceAnnotations, sectionData.riceAnnotationsEnglish, lang)}
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
                title={localized(section.title, section.title_english, lang)}
                dishes={section.dishes}
                annotations={localizedArray(section.annotations, section.annotations_english, lang)}
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
