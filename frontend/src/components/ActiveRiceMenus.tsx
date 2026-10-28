import { useEffect, useState } from 'preact/hooks'
import { Link } from 'wouter-preact'
import { activeRiceContent } from '../lib/activeRiceMenus'
import { normalizePublicMenu } from '../lib/backendAdapters'
import { localized, useI18n } from '../lib/i18n'
import { prerenderData } from '../lib/prerenderData'
import { menuPath } from '../lib/routes'
import { MenuSection } from '../routes/client/MenuShared'
import type { PublicMenu } from '../lib/types'

const marker = (name: string) => ({ __html: `<!--vc-active-rice-menus:${name}-->` })

export function ActiveRiceMenus() {
  const { lang, t } = useI18n()
  const [menus, setMenus] = useState(prerenderData().menus)

  useEffect(() => {
    // Direct requests are refreshed by the origin. Fetch only fills the data
    // gap after client navigation and keeps the last good SSR HTML on failure.
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
    }).catch(() => {})
    return () => controller.abort()
  }, [])

  const current = activeRiceContent(menus)
  return (
    <>
      <div class="editorial-menu-marker" dangerouslySetInnerHTML={marker('start')} />
      {current.dishes.length || current.links.length ? (
        <div class="container editorial-menu-list" data-testid="active-rice-menus">
          {current.dishes.length && current.menu ? (
            <MenuSection title={t('rice.activeTitle')} dishes={current.dishes} showImage={current.menu.show_dish_images} showDishPrice />
          ) : null}
          {current.links.length ? (
            <nav class="editorial-rice-links" aria-label={t('rice.menusNavigation')}>
              {current.links.map((menu) => (
                <Link href={menuPath(menu)} className="editorial-rice-link" key={menu.id}>
                  <span>{localized(menu.menu_title, menu.menu_title_english, lang)}</span><span aria-hidden="true">→</span>
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      ) : null}
      <div class="editorial-menu-marker" dangerouslySetInnerHTML={marker('end')} />
    </>
  )
}
