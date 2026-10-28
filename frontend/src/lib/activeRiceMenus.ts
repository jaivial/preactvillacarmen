import type { Dish, PublicMenu } from './types'
import { getMenuViewSections, isRiceSection } from '../routes/client/menuPublicHelpers'

export const ACTIVE_RICE_MENU_SLUGS = ['menu-del-dia-41', 'menu-fin-de-semana-42', 'menu-arrocero-1'] as const

export type ActiveRiceContent = { menu?: PublicMenu; dishes: Dish[]; links: PublicMenu[] }

function riceKey(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase()
}

// Editorial landings show one deduplicated weekend list. Links still expose
// every active relevant menu, including when the weekend menu is disabled.
export function activeRiceContent(menus: Record<string, PublicMenu>): ActiveRiceContent {
  const bySlug = new Map(Object.values(menus).filter((menu) => menu.active && menu.menu_public_active !== false).map((menu) => [menu.slug, menu]))
  const links = ACTIVE_RICE_MENU_SLUGS.flatMap((slug) => {
    const menu = bySlug.get(slug)
    return menu ? [menu] : []
  })
  const menu = bySlug.get('menu-fin-de-semana-42')
  if (!menu) return { dishes: [], links }
  const seen = new Set<string>()
  const dishes = getMenuViewSections(menu).filter(isRiceSection).flatMap((section) => section.dishes).filter((dish) => {
    const key = riceKey(dish.descripcion)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
  return { menu, dishes, links }
}
