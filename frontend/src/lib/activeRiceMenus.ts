import type { PublicMenu, PublicMenuDish, PublicMenuSection } from './types'

export const ACTIVE_RICE_MENU_SLUGS = ['menu-del-dia-41', 'menu-fin-de-semana-42', 'menu-arrocero-1'] as const

export type ActiveRiceMenu = { menu: PublicMenu; sections: PublicMenuSection[] }

function isRiceSection(section: PublicMenuSection) {
  const title = `${section.title} ${section.display_title || ''}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return section.kind === 'arroces' || title.includes('arroz') || title.includes('paella')
}

export function activeRiceMenus(menus: Record<string, PublicMenu>): ActiveRiceMenu[] {
  return ACTIVE_RICE_MENU_SLUGS.flatMap((slug) => {
    const menu = Object.values(menus).find((item) => item.slug === slug)
    if (!menu?.active || menu.menu_public_active === false) return []
    const sections = menu.sections.filter(isRiceSection).map((section) => ({
      ...section,
      dishes: section.dishes.filter((dish: PublicMenuDish) => dish.active !== false),
    })).filter((section) => section.dishes.length > 0)
    return sections.length ? [{ menu, sections }] : []
  })
}
