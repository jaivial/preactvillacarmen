import { useEffect, useMemo, useState } from 'preact/hooks'
import { useI18n } from '../../lib/i18n'
import { fetchMenuByID } from '../../lib/menuApi'
import { MenuCartaConvencional } from './MenuCartaConvencional'
import { MenuCerradoConvencional } from './MenuCerradoConvencional'
import { MenuEspecial } from './MenuEspecial'
import { MenusDeGruposCarta } from './MenusDeGruposCarta'
import { MenusDeGruposConvencional } from './MenusDeGruposConvencional'
import { MenuUnavailable } from './MenuUnavailable'
import type { PublicMenu } from '../../lib/types'

type MenuCatalogRouteProps = {
  params: {
    menuId?: string
    menuSlug?: string
  }
}

function checkpoint(name: string, detail?: Record<string, unknown>) {
  if (detail) {
    console.log(`[checkpoint] ${name}`, JSON.stringify(detail))
  } else {
    console.log(`[checkpoint] ${name}`)
  }
}

export function MenuCatalogRoute(props: MenuCatalogRouteProps) {
  const { t } = useI18n()
  const [menu, setMenu] = useState<PublicMenu | null | undefined>(undefined)

  const menuId = useMemo(() => {
    const parsed = Number(props.params.menuId || '')
    return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
  }, [props.params.menuId])

  useEffect(() => {
    if (menuId <= 0) {
      setMenu(null)
      return
    }
    let cancelled = false
    setMenu(undefined)
    checkpoint('menu_catalog_fetch_started', { menu_id: menuId })
    fetchMenuByID(menuId)
      .then((m) => {
        if (cancelled) return
        checkpoint('menu_catalog_menu_received', { menu_id: menuId, menu_type: m.menu_type })
        setMenu(m)
      })
      .catch((err) => {
        checkpoint('menu_catalog_fetch_failed', { menu_id: menuId, error: String(err) })
        if (!cancelled) setMenu(null)
      })
    return () => {
      cancelled = true
    }
  }, [menuId])

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
  if (menu.menu_type === 'a_la_carte') {
    return <MenuCartaConvencional menu={menu} />
  }
  if (menu.menu_type === 'special') {
    return <MenuEspecial menu={menu} />
  }
  if (menu.menu_type === 'closed_group') {
    return <MenusDeGruposConvencional menu={menu} />
  }
  if (menu.menu_type === 'a_la_carte_group') {
    return <MenusDeGruposCarta menu={menu} />
  }
  return <MenuCerradoConvencional menu={menu} />
}
