import { describe, expect, it } from 'vitest'
import { activeRiceContent } from './activeRiceMenus'
import type { PublicMenu, PublicMenuDish, PublicMenuSection } from './types'

function dish(id: number, title: string, active = true): PublicMenuDish {
  return { id, title, description: '', description_enabled: true, supplement_enabled: false, supplement_price: null, price: null, allergens: [], position: 0, active }
}
function section(id: number, dishes: PublicMenuDish[], kind = 'arroces'): PublicMenuSection {
  return { id, title: 'Arroces', display_title: 'Arroces', kind, position: id, annotations: [], dishes }
}
function menu(id: number, slug: string, active = true, sections?: PublicMenuSection[]): PublicMenu {
  return {
    id, slug, menu_title: slug, menu_type: 1, price: '20', active,
    menu_subtitle: [], entrantes: [], principales: { titulo_principales: '', items: [] }, postre: [],
    settings: { included_coffee: false, beverage: {}, comments: [], important_info: [], min_party_size: 1, main_dishes_limit: false, main_dishes_limit_number: 1, beverage_options: [] },
    sections: sections || [section(id, [dish(id, `Arroz ${id}`)], id === 1 ? 'principales' : 'arroces')],
    show_dish_images: false, show_section_tabs: false, special_menu_sections: [], special_menu_image_url: '', menu_public_active: true, web_placement: 'inside_menus', show_menu_preview_image: false, menu_preview_image_url: '', created_at: '', modified_at: '', weekdays: {}, weekdays_available: [],
  }
}

describe('activeRiceContent', () => {
  it('lists only unique active weekend rice dishes without section grouping', () => {
    const weekend = menu(42, 'menu-fin-de-semana-42', true, [
      section(1, [dish(1, 'Arroz del senyoret'), dish(2, 'Arroz a banda')]),
      section(2, [dish(3, '  arroz del SENYORET '), dish(4, 'Arroz oculto', false)]),
    ])
    const current = activeRiceContent({ '41': menu(41, 'menu-del-dia-41'), '42': weekend, '1': menu(1, 'menu-arrocero-1') })
    expect(current.dishes.map((dish) => dish.descripcion)).toEqual(['Arroz del senyoret', 'Arroz a banda'])
    expect(current.links.map((menu) => menu.id)).toEqual([41, 42, 1])
  })

  it('keeps active menu backlinks when weekend is inactive and omits private links', () => {
    const current = activeRiceContent({
      '41': menu(41, 'menu-del-dia-41'),
      '42': menu(42, 'menu-fin-de-semana-42', false),
      '1': { ...menu(1, 'menu-arrocero-1'), menu_public_active: false },
    })
    expect(current.dishes).toEqual([])
    expect(current.menu).toBeUndefined()
    expect(current.links.map((menu) => menu.id)).toEqual([41])
  })
})
