import { useEffect, useMemo, useState } from 'preact/hooks'
import { Redirect } from 'wouter-preact'
import { useI18n } from '../../lib/i18n'
import { buildPublicMenuHref, findFirstGroupMenu, findLegacyConventionalMenu } from '../../lib/publicMenus'
import { fetchMenuSidebar } from '../../lib/menuApi'
import { MenuUnavailable } from './MenuUnavailable'
import type { SidebarMenu } from '../../lib/types'

type LegacyRedirectTarget = 'dia' | 'finde' | 'grupos'

function sidebarToSidebarLike(menus: SidebarMenu[]) {
  return menus.map((m) => ({
    id: m.id,
    slug: m.slug,
    menu_title: m.menu_title,
    menu_type: m.menu_type,
    active: m.active,
    legacy_source_table: m.legacy_source_table,
  }))
}

export function LegacyMenuRedirect(props: { target: LegacyRedirectTarget }) {
  const { t } = useI18n()
  const [sidebarMenus, setSidebarMenus] = useState<SidebarMenu[] | null | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    fetchMenuSidebar()
      .then((menus) => {
        if (!cancelled) setSidebarMenus(menus)
      })
      .catch(() => {
        if (!cancelled) setSidebarMenus(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const menuHref = useMemo(() => {
    if (!sidebarMenus || sidebarMenus.length === 0) return ''
    const menus = sidebarToSidebarLike(sidebarMenus)

    if (props.target === 'dia') {
      const match = findLegacyConventionalMenu(menus as any, 'DIA')
      return match ? buildPublicMenuHref(match) : ''
    }

    if (props.target === 'finde') {
      const match = findLegacyConventionalMenu(menus as any, 'FINDE')
      return match ? buildPublicMenuHref(match) : ''
    }

    const groupMenu = findFirstGroupMenu(menus as any)
    return groupMenu ? buildPublicMenuHref(groupMenu) : ''
  }, [props.target, sidebarMenus])

  if (sidebarMenus === undefined) {
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

  if (!menuHref) {
    const isGroupTarget = props.target === 'grupos'
    return (
      <MenuUnavailable
        title={isGroupTarget ? t('menu.fallback.groups.title') : t('menu.fallback.title')}
        message={isGroupTarget ? t('menu.fallback.groups.body') : t('menu.fallback.body')}
      />
    )
  }

  return <Redirect to={menuHref} replace />
}
