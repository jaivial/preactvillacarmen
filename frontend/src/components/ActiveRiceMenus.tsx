import { useEffect, useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { activeRiceMenus } from '../lib/activeRiceMenus'
import { normalizePublicMenu } from '../lib/backendAdapters'
import { localized, localizedArray, useI18n } from '../lib/i18n'
import { prerenderData } from '../lib/prerenderData'
import { menuPath } from '../lib/routes'
import type { PublicMenu } from '../lib/types'

const marker = (name: string) => ({ __html: `<!--vc-active-rice-menus:${name}-->` })

export function ActiveRiceMenus() {
  const { lang, t } = useI18n()
  const [menus, setMenus] = useState(prerenderData().menus)

  useEffect(() => {
    // Direct requests are prerendered and refreshed by the origin. This only
    // fills the data gap when a visitor arrives here through client navigation.
    if (Object.keys(menus).length >= 3) return
    const controller = new AbortController()
    Promise.all([41, 42, 1].map(async (id) => {
      const response = await fetch(`/api/menus/${id}`, { signal: controller.signal })
      if (!response.ok) return null
      const payload = await response.json()
      return payload.menu ? normalizePublicMenu(payload.menu) : null
    })).then((loaded) => {
      const next: Record<string, PublicMenu> = {}
      loaded.forEach((menu) => { if (menu) next[String(menu.id)] = menu })
      setMenus(next)
    }).catch(() => { /* Keep the server-rendered content on an API failure. */ })
    return () => controller.abort()
  }, [])

  const current = activeRiceMenus(menus)
  if (!current.length) return null
  return (
    <>
      <div class="editorial-menu-marker" dangerouslySetInnerHTML={marker('start')} />
      <div class="container editorial-menu-list" data-testid="active-rice-menus">
        <header class="editorial-menu-heading">
          <h2>{t('rice.activeTitle')}</h2>
          <p>{t('rice.activeIntro')}</p>
        </header>
        {current.map(({ menu, sections }) => {
          const price = Number(menu.price)
          const conditions = localizedArray(menu.settings.comments, menu.settings.comments_english, lang)
          return (
            <section class="editorial-menu" data-menu-id={menu.id} key={menu.id} aria-labelledby={`rice-menu-${menu.id}`}>
              <h3 id={`rice-menu-${menu.id}`}>{localized(menu.menu_title, menu.menu_title_english, lang)}</h3>
              <p class="editorial-menu-price">
                {Number.isFinite(price) && price > 0 ? <strong>{price.toFixed(2).replace('.00', '')} € {t('rice.perPerson')}</strong> : null}
                {menu.settings.min_party_size > 1 ? <span>{t('rice.minimum')} {menu.settings.min_party_size} {t('rice.people')}</span> : null}
              </p>
              {sections.map((section) => (
                <div class="editorial-rice-section" key={section.id}>
                  <h4>{localized(section.display_title || section.title, section.display_title_english || section.title_english, lang)}</h4>
                  <ul class="editorial-dishes">
                    {section.dishes.map((dish) => {
                      const description = localized(dish.description, dish.description_english, lang)
                      return (
                        <li key={dish.id}>
                          <h5>{localized(dish.title, dish.title_english, lang)}</h5>
                          {dish.description_enabled && description ? <p>{description}</p> : null}
                          {dish.supplement_enabled && dish.supplement_price ? <span class="editorial-dish-supplement">{t('rice.supplement')} +{dish.supplement_price} €</span> : null}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
              <Link href={menuPath(menu)} className="btn primary">{t('rice.menu')}</Link>
              {conditions.length ? <><h4>{t('rice.conditions')}</h4><ul class="editorial-menu-conditions">{conditions.map((condition) => <li key={condition}>{condition}</li>)}</ul></> : null}
            </section>
          )
        })}
      </div>
      <div class="editorial-menu-marker" dangerouslySetInnerHTML={marker('end')} />
    </>
  )
}
