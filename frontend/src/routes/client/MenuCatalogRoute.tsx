import { useMemo } from 'preact/hooks'
import { useI18n } from '../../lib/i18n'
import { usePublicMenus } from '../../lib/publicMenus'
import { MenuCartaConvencional } from './MenuCartaConvencional'
import { MenuCerradoConvencional } from './MenuCerradoConvencional'
import { MenuEspecial } from './MenuEspecial'
import { MenusDeGruposCarta } from './MenusDeGruposCarta'
import { MenusDeGruposConvencional } from './MenusDeGruposConvencional'
import { MenuUnavailable } from './MenuUnavailable'

type MenuCatalogRouteProps = {
  params: {
    menuId?: string
    menuSlug?: string
  }
}

export function MenuCatalogRoute(props: MenuCatalogRouteProps) {
  const { t } = useI18n()
  const publicMenus = usePublicMenus()

  const menuId = useMemo(() => {
    const parsed = Number(props.params.menuId || '')
    return Number.isFinite(parsed) ? Math.trunc(parsed) : 0
  }, [props.params.menuId])

  const selectedMenu = useMemo(() => {
    if (!publicMenus || menuId <= 0) return null
    return publicMenus.find((menu) => menu.id === menuId) || null
  }, [menuId, publicMenus])

  if (publicMenus === undefined) {
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

  if (publicMenus === null || !selectedMenu) {
    return (
      <MenuUnavailable
        title={t('menu.fallback.title')}
        message={publicMenus === null ? t('menu.error') : t('menu.fallback.body')}
      />
    )
  }

  if (selectedMenu.menu_type === 'a_la_carte') {
    return <MenuCartaConvencional menu={selectedMenu} />
  }
  if (selectedMenu.menu_type === 'special') {
    return <MenuEspecial menu={selectedMenu} />
  }
  if (selectedMenu.menu_type === 'closed_group') {
    return <MenusDeGruposConvencional menu={selectedMenu} />
  }
  if (selectedMenu.menu_type === 'a_la_carte_group') {
    return <MenusDeGruposCarta menu={selectedMenu} />
  }
  return <MenuCerradoConvencional menu={selectedMenu} />
}
