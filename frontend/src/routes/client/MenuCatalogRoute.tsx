import { useEffect, useMemo, useState } from 'preact/hooks'
import { useLocation } from 'wouter-preact'
import { useI18n } from '../../lib/i18n'
import { fetchMenuByID, fetchMenuBySlug } from '../../lib/menuApi'
import { initialMenu, initialMenuBySlug, setPrerenderData, prerenderData } from '../../lib/prerenderData'
import { menuPath } from '../../lib/routes'
import { MenuTemplateFor } from './menuTemplateFor'
import { MenuUnavailable } from './MenuUnavailable'
import { MenuSEOContent } from '../../components/MenuSEOContent'
import type { PublicMenu } from '../../lib/types'

type MenuCatalogRouteProps = {
  params: {
    menuId?: string
    menuSlug?: string
  }
}

function checkpoint(name: string, detail?: Record<string, unknown>) {
  if (!import.meta.env.DEV) return
  if (detail) {
    console.log(`[checkpoint] ${name}`, JSON.stringify(detail))
  } else {
    console.log(`[checkpoint] ${name}`)
  }
}

export function MenuCatalogRoute(props: MenuCatalogRouteProps) {
  const { t } = useI18n()
  const [, navigate] = useLocation()
  const { menuId, menuKey } = useMemo(() => {
    const routeKey = props.params.menuId || ''
    const parsed = Number(routeKey)
    return {
      menuId: /^\d+$/.test(routeKey) && Number.isSafeInteger(parsed) ? parsed : 0,
      menuKey: routeKey,
    }
  }, [props.params.menuId])
  const [menu, setMenu] = useState<PublicMenu | null | undefined>(() => (
    menuId > 0 ? initialMenu(menuId) : initialMenuBySlug(menuKey)
  ))

  useEffect(() => {
    if (!menuKey || (menuId === 0 && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(menuKey))) {
      setMenu(null)
      return
    }
    let cancelled = false
    setMenu(menuId > 0 ? initialMenu(menuId) : initialMenuBySlug(menuKey))
    checkpoint('menu_catalog_fetch_started', { menu_key: menuKey })
    const request = menuId > 0 ? fetchMenuByID(menuId) : fetchMenuBySlug(menuKey)
    request
      .then((m) => {
        if (cancelled) return
        checkpoint('menu_catalog_menu_received', { menu_key: menuKey, menu_type: m.menu_type })
        setMenu(m)
        // Keep RouteHead, structured data and later client-side navigation in
        // sync with the menu loaded outside the build-time prerender catalog.
        setPrerenderData({ ...prerenderData(), menus: { ...prerenderData().menus, [m.id]: m } })
        window.dispatchEvent(new Event('villacarmen:menus-updated'))
        // Legacy numeric/wrong-slug URLs stay valid, but are replaced in the
        // browser as well as in the static-host redirect manifest.
        if (menuPath(m) !== `/menu/${menuKey}${props.params.menuSlug ? `/${props.params.menuSlug}` : ''}`) {
          navigate(menuPath(m), { replace: true })
        }
      })
      .catch((err) => {
        checkpoint('menu_catalog_fetch_failed', { menu_key: menuKey, error: String(err) })
        if (!cancelled) setMenu(null)
      })
    return () => {
      cancelled = true
    }
  }, [menuId, menuKey, navigate, props.params.menuSlug])

  if (menu === undefined) {
    return (
      <div class="page menuPage" data-testid="menu-catalog-page">
        <section class="menuBody">
          <div class="container">
            <div class="menuState" data-testid="menu-catalog-state-loading">{t('menus.preview.loading')}</div>
          </div>
        </section>
      </div>
    )
  }

  if (menu === null) {
    return (
      <MenuUnavailable
        title={t('menu.fallback.title')}
        message={t('menu.fallback.body')}
      />
    )
  }

  checkpoint('menu_catalog_menu_rendered', { menu_id: menu.id, menu_type: menu.menu_type })
  return <><MenuTemplateFor menu={menu} /><MenuSEOContent menu={menu} /></>
}
