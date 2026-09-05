import { useMemo } from 'preact/hooks'
import type { PublicMenu } from '../../lib/types'
import { localized, localizedArray, useI18n } from '../../lib/i18n'
import { formatEuro, GroupStyleDishSection, MenuHeroSlider } from './MenuShared'
import { getMenuViewSections } from './menuPublicHelpers'
import { MenuSectionTabs } from './MenuSectionTabs'

function beverageText(menu: PublicMenu, t: (key: string) => string): string[] {
  const beverageType = String(menu.settings.beverage.type || 'no_incluida').toLowerCase().trim()
  const options = Array.isArray(menu.settings.beverage_options) ? menu.settings.beverage_options : []
  const includedNames = options
    .filter((option) => option.selected !== false)
    .map((option) => String(option.name || '').trim())
    .filter(Boolean)
  const includedPhrase = includedNames.length > 0
    ? `${t('groupMenus.beverage.includes1')} (${includedNames.join(', ')})`
    : t('groupMenus.beverage.includes1')
  if (beverageType === 'ilimitada') {
    return [
      `${t('groupMenus.beverage.unlimited')} +${formatEuro(Number(menu.settings.beverage.price_per_person || 8))} ${t('groupMenus.beverage.pax')}`,
      t('groupMenus.beverage.table'),
      includedPhrase,
    ]
  }
  if (beverageType === 'opcion' || beverageType === 'option') {
    return [
      `${t('groupMenus.beverage.option')} +${formatEuro(Number(menu.settings.beverage.price_per_person || 8))} ${t('groupMenus.beverage.pax')}`,
      t('groupMenus.beverage.table'),
      includedPhrase,
    ]
  }
  return [t('groupMenus.beverage.notIncluded')]
}

export function MenusDeGruposConvencional(props: { menu: PublicMenu }) {
  const { t, lang } = useI18n()
  const sections = useMemo(() => getMenuViewSections(props.menu), [props.menu])
  const subtitles = useMemo(
    () => localizedArray(props.menu.menu_subtitle, props.menu.menu_subtitle_english, lang),
    [lang, props.menu.menu_subtitle, props.menu.menu_subtitle_english],
  )
  const pageSubtitle = useMemo(() => subtitles[0] || t('menus.card.groups.subtitle'), [subtitles, t])
  const beverageLines = useMemo(() => {
    const lines = beverageText(props.menu, t)
    // Named observation point: public payload assembled into render lines.
    if (typeof window !== 'undefined' && window.location.search.includes('vcdebug=1')) {
      console.log(`[checkpoint] public_beverage_lines_rendered count=${lines.length} menu_id=${props.menu.id}`)
    }
    return lines
  }, [props.menu, t])
  const comments = useMemo(
    () => localizedArray(props.menu.settings.comments, props.menu.settings.comments_english, lang),
    [lang, props.menu.settings.comments, props.menu.settings.comments_english],
  )
  const priceValue = useMemo(() => Number(props.menu.price), [props.menu.price])

  return (
    <div class="page menuPage">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{localized(props.menu.menu_title, props.menu.menu_title_english, lang)}</h1>
          <p class="page-subtitle">{pageSubtitle}</p>
        </div>
      </section>

      <MenuHeroSlider images={props.menu.slider_images} hidden={props.menu.slider_mode === 'hidden'} />

      <section class="menuBody">
        <div class="container">
          <article class="menuSectionCard groupPanel">
            <div class="menugrupos-decor">
              <img class="menugrupos-flower-top-left" src="/media/menugrupos/pngegg.png" alt="" loading="lazy" />
              <img class="menugrupos-flower-bottom-right" src="/media/menugrupos/pngegg2.png" alt="" loading="lazy" />
              <img class="menugrupos-vine" src="/media/menugrupos/enredadera.png" alt="" loading="lazy" />
            </div>

            <h2 class="menuSectionTitle">{localized(props.menu.menu_title, props.menu.menu_title_english, lang)}</h2>

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
              <MenuSectionTabs
                enabled={props.menu.show_section_tabs}
                ariaLabel={localized(props.menu.menu_title, props.menu.menu_title_english, lang)}
                bubbleId="menuSectionTabBubble"
                testId="menu-grupos-convencional-section-tabs"
                panels={sections.map((section) => ({
                  key: `${section.id}-${section.title}`,
                  label: localized(section.title, section.title_english, lang),
                  content: (
                    <GroupStyleDishSection
                      title={localized(section.title, section.title_english, lang)}
                      dishes={section.dishes}
                      annotations={localizedArray(section.annotations, section.annotations_english, lang)}
                    />
                  ),
                }))}
              />

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
