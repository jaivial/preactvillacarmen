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
    fetchMenuByID(menuId)
      .then((m) => {
        if (!cancelled) setMenu(m)
      })
      .catch(() => {
        if (!cancelled) setMenu(null)
      })
    return () => {
      cancelled = true
    }
  }, [menuId])

  if (menu === undefined) {
    return (
      <div class="page menuPage">
        <section class="menuBody">
          <div class="container">
            <div class="menuState">{t('menus.preview.loading')}</div>
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
