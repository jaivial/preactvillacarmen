import { createContext } from 'preact'
import { useContext } from 'preact/hooks'
import type { PublicMenu, PublicMenuType } from './types'

export type LegacySourceTable = 'DIA' | 'FINDE'

export const PublicMenusContext = createContext<PublicMenu[] | null | undefined>(undefined)

export function usePublicMenus() {
  return useContext(PublicMenusContext)
}

function normalizeMenuTypeToken(menuType: PublicMenuType | string): string {
  return String(menuType || '')
    .trim()
    .toLowerCase()
    .replace(/[.\s-]+/g, '_')
}

export function isGroupMenuType(menuType: PublicMenuType | string): boolean {
  const normalized = normalizeMenuTypeToken(menuType)
  if (!normalized) return false
  return normalized === 'group' || normalized.endsWith('_group') || normalized.includes('_group_')
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

// Coordination id: menu_weekday_availability_v1
// (booking date -> weekday -> menu_weekday_availability -> default menu).
//
// The weekday tokens are the SAME ones written by the backoffice WeekdayGrid
// and stored in the backend `menu_weekday_availability` table.
export const MENU_WEEKDAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export type MenuWeekdayKey = (typeof MENU_WEEKDAY_KEYS)[number]

/** Maps a date (ISO string or Date) to its canonical weekday key. */
export function menuWeekdayKeyForDate(value: string | Date): MenuWeekdayKey | null {
  const date = value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  // getDay(): 0 = Sunday .. 6 = Saturday; MENU_WEEKDAY_KEYS starts on Monday.
  const index = (date.getDay() + 6) % 7
  return MENU_WEEKDAY_KEYS[index] ?? null
}

/**
 * Whether a menu is served on the given weekday. Menus without a weekday
 * calendar (older data) are treated as always available so nothing disappears.
 */
export function menuServesWeekday(menu: Pick<PublicMenu, 'weekdays'>, weekday: MenuWeekdayKey): boolean {
  const calendar = menu.weekdays
  if (!calendar || typeof calendar !== 'object') return true
  return calendar[weekday] === true
}

/**
 * Resolves the default menu for a booking date: the first active
 * "menú cerrado convencional" menu whose weekday calendar includes that day,
 * falling back to any active closed conventional menu.
 */
export function findDefaultMenuForWeekday(menus: PublicMenu[], value: string | Date): PublicMenu | null {
  const weekday = menuWeekdayKeyForDate(value)
  if (!weekday) return null
  const conventional = menus.filter((menu) => menu.menu_type === 'closed_conventional' && menu.active)
  const serving = conventional.find((menu) => menuServesWeekday(menu, weekday))
  return serving ?? conventional[0] ?? null
}

/** Lists the canonical weekday keys a menu is served on. */
export function menuServedWeekdays(menu: Pick<PublicMenu, 'weekdays'>): MenuWeekdayKey[] {
  const calendar = menu.weekdays
  if (!calendar || typeof calendar !== 'object') return [...MENU_WEEKDAY_KEYS]
  return MENU_WEEKDAY_KEYS.filter((key) => calendar[key] === true)
}
