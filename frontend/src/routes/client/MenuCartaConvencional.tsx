import { useMemo } from 'preact/hooks'
import type { PublicMenu } from '../../lib/types'
import { localized, localizedArray, useI18n } from '../../lib/i18n'
import { menuBeverageNote } from '../../lib/menuBeverageNote'
import { AllergensLegend, GroupStyleDishSection, MenuHeroSlider } from './MenuShared'
import { getMenuViewSections } from './menuPublicHelpers'
import { MenuSectionTabs } from './MenuSectionTabs'

export function MenuCartaConvencional(props: { menu: PublicMenu }) {
  const { t, lang } = useI18n()
  const subtitle = useMemo(
    () => localizedArray(props.menu.menu_subtitle, props.menu.menu_subtitle_english, lang)[0] || 'Carta convencional',
    [lang, props.menu.menu_subtitle, props.menu.menu_subtitle_english],
  )
  const sections = useMemo(() => getMenuViewSections(props.menu), [props.menu])
  const comments = useMemo(
    () => localizedArray(props.menu.settings.comments, props.menu.settings.comments_english, lang),
    [lang, props.menu.settings.comments, props.menu.settings.comments_english],
  )
  const infoLines = useMemo(() => [menuBeverageNote(props.menu, lang), ...comments].filter(Boolean), [comments, lang, props.menu])

  return (
    <div class="page menuPage">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{localized(props.menu.menu_title, props.menu.menu_title_english, lang)}</h1>
          <p class="page-subtitle">{subtitle}</p>
        </div>
      </section>

      <MenuHeroSlider images={props.menu.slider_images} hidden={props.menu.slider_mode === 'hidden'} />

      <section class="menuBody">
        <div class="container">
          {sections.length === 0 ? (
            <div class="menuState">{t('menu.empty')}</div>
          ) : (
            <article class="menuSectionCard">
              <div class="menuGrid menuGrid--single">
                <MenuSectionTabs
                  enabled={props.menu.show_section_tabs}
                  ariaLabel={localized(props.menu.menu_title, props.menu.menu_title_english, lang)}
                  bubbleId="menuSectionTabBubble"
                  testId="menu-carta-section-tabs"
                  panels={sections.map((section) => ({
                    key: `${section.id}-${section.title}`,
                    label: localized(section.title, section.title_english, lang),
                    content: (
                      <GroupStyleDishSection
                        title={localized(section.title, section.title_english, lang)}
                        dishes={section.dishes}
                        annotations={localizedArray(section.annotations, section.annotations_english, lang)}
                        showDishPrice={true}
                        showAllergens={true}
                      />
                    ),
                  }))}
                />

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
