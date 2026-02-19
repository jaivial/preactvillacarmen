import { createContext } from 'preact'
import { useContext } from 'preact/hooks'
import type { PublicMenu, PublicMenuType } from './types'

export type LegacySourceTable = 'DIA' | 'FINDE'

export const PublicMenusContext = createContext<PublicMenu[] | null | undefined>(undefined)

export function usePublicMenus() {
  return useContext(PublicMenusContext)
}

export function isGroupMenuType(menuType: PublicMenuType | string): boolean {
  return menuType === 'closed_group' || menuType === 'a_la_carte_group'
}

export function isNonGroupMenuType(menuType: PublicMenuType | string): boolean {
  return !isGroupMenuType(menuType)
}

export function buildPublicMenuHref(menu: Pick<PublicMenu, 'id' | 'slug'>): string {
  const slug = String(menu.slug || '').trim()
  if (slug) return `/menu/${encodeURIComponent(String(menu.id))}/${encodeURIComponent(slug)}`
  return `/menu/${encodeURIComponent(String(menu.id))}`
}

export function findLegacyConventionalMenu(menus: PublicMenu[], source: LegacySourceTable): PublicMenu | null {
  const match = menus.find(
    (menu) =>
      menu.menu_type === 'closed_conventional' &&
      String(menu.legacy_source_table || '').toUpperCase() === source &&
      menu.active,
  )
  if (match) return match

  const fallback = menus.find((menu) => menu.menu_type === 'closed_conventional' && menu.active)
  return fallback || null
}

export function findFirstGroupMenu(menus: PublicMenu[]): PublicMenu | null {
  const groupMenu = menus.find((menu) => isGroupMenuType(menu.menu_type) && menu.active)
  return groupMenu || null
}
