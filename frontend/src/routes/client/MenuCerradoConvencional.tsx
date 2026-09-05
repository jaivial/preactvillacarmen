import { useMemo } from 'preact/hooks'
import type { PublicMenu } from '../../lib/types'
import { localized, localizedArray, useI18n } from '../../lib/i18n'
import { AllergensLegend, MenuHeroSlider, MenuPriceCard, MenuSection } from './MenuShared'
import { formatMenuPrice, splitClosedConventionalSections } from './menuPublicHelpers'
import { MenuSectionTabs } from './MenuSectionTabs'

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

      <MenuHeroSlider images={props.menu.slider_images} hidden={props.menu.slider_mode === 'hidden'} />

      <section class="menuBody">
        <div class="container">
          <div class="menuMain">
            <MenuSectionTabs
              enabled={props.menu.show_section_tabs}
              ariaLabel={localized(props.menu.menu_title, props.menu.menu_title_english, lang)}
              bubbleId="menuSectionTabBubble"
              testId="menu-cerrado-section-tabs"
              panels={[
                {
                  key: 'starters',
                  label: localized(sectionData.startersTabLabel || t('menus.preview.starters'), sectionData.startersTabLabelEnglish, lang),
                  hidden: sectionData.starters.length === 0,
                  content: (
                    <MenuSection
                      title={t('menus.preview.starters')}
                      subtitle={localized(sectionData.startersSubtitle ?? '', sectionData.startersSubtitleEnglish ?? '', lang)}
                      dishes={sectionData.starters}
                      annotations={localizedArray(sectionData.starterAnnotations, sectionData.starterAnnotationsEnglish, lang)}
                      pickCategory="entrantes"
                      showImage={props.menu.show_dish_images}
                    />
                  ),
                },
                {
                  key: 'mains',
                  label: localized(sectionData.mainsTabLabel || sectionData.mainsTitle || t('menus.preview.mains'), sectionData.mainsTabLabelEnglish || sectionData.mainsTitleEnglish, lang),
                  hidden: sectionData.mains.length === 0,
                  content: (
                    <MenuSection
                      title={localized(sectionData.mainsTitle || t('menus.preview.mains'), sectionData.mainsTitleEnglish, lang)}
                      subtitle={localized(sectionData.mainsSubtitle ?? '', sectionData.mainsSubtitleEnglish ?? '', lang)}
                      dishes={sectionData.mains}
                      annotations={localizedArray(sectionData.mainsAnnotations, sectionData.mainsAnnotationsEnglish, lang)}
                      pickCategory="principales"
                      showImage={props.menu.show_dish_images}
                    />
                  ),
                },
                {
                  key: 'rice',
                  label: localized(sectionData.riceTabLabel || sectionData.riceTitle || t('menu.section.rice'), sectionData.riceTabLabelEnglish || sectionData.riceTitleEnglish, lang),
                  hidden: sectionData.rice.length === 0,
                  content: (
                    <>
                      <p class="menuSectionLead">{t('menu.rice.lead')}</p>
                      <MenuSection
                        title={localized(sectionData.riceTitle || t('menu.section.rice'), sectionData.riceTitleEnglish, lang)}
                        subtitle={localized(sectionData.riceSubtitle ?? '', sectionData.riceSubtitleEnglish ?? '', lang)}
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
                    </>
                  ),
                },
                ...sectionData.others.map((section) => ({
                  key: `${section.id}-${section.id}`,
                  label: localized(section.tab_label || section.display_title || section.title, section.tab_label_english || section.display_title_english || section.title_english, lang),
                  hidden: section.dishes.length === 0,
                  content: (
                    <MenuSection
                      title={localized(section.display_title || section.title, section.display_title_english || section.title_english, lang)}
                      subtitle={localized(section.subtitle ?? '', section.subtitle_english ?? '', lang)}
                      dishes={section.dishes}
                      annotations={localizedArray(section.annotations, section.annotations_english, lang)}
                      showImage={props.menu.show_dish_images}
                    />
                  ),
                })),
              ]}
            />

            {!hasContent ? <div class="menuState">{t('menu.empty')}</div> : null}

            <MenuPriceCard precio={price} />
          </div>

          <AllergensLegend />
        </div>
      </section>
    </div>
  )
}
