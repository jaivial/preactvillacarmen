import { useMemo } from 'preact/hooks'
import type { PublicMenu } from '../../lib/types'
import { useI18n } from '../../lib/i18n'
import { GroupStyleDishSection, MenuHeroSlider } from './MenuShared'
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
  const beverage = useMemo(() => groupCartaBeverage(props.menu), [props.menu])

  return (
    <div class="page menuPage">
      <section class="page-hero">
        <div class="container">
          <h1 class="page-title">{props.menu.menu_title}</h1>
          <p class="page-subtitle">{subtitles[0] || 'Menu de grupos a la carta'}</p>
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
              ) : null}

              <div class="menuGrid menuGrid--single">
                {sections.map((section) => (
                  <GroupStyleDishSection
                    key={`${section.id}-${section.title}`}
                    title={section.title}
                    dishes={section.dishes}
                    annotations={section.annotations}
                    showDishPrice={true}
                  />
                ))}

                <section class="menuSubSection">
                  <h3 class="menuSubTitle">Previsión</h3>
                  <p class="menuDishText">Cada persona elige sus platos y paga según el precio de cada plato.</p>
                  <p class="menuDishText menuMuted">No existe un precio total cerrado del menú completo.</p>
                </section>

                <section class="menuSubSection">
                  <h3 class="menuSubTitle">{t('groupMenus.section.beverages')}</h3>
                  <p class="menuDishText menuMuted">{beverage}</p>
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
          )}
        </div>
      </section>
    </div>
  )
}
