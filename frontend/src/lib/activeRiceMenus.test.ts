import { describe, expect, it } from 'vitest'
import { activeRiceMenus } from './activeRiceMenus'
import type { PublicMenu } from './types'

function menu(id: number, slug: string, active = true): PublicMenu {
  return {
    id, slug, menu_title: slug, menu_type: 1, price: '20', active,
    menu_subtitle: [], entrantes: [], principales: { titulo_principales: '', items: [] }, postre: [],
    settings: { included_coffee: false, beverage: {}, comments: [], important_info: [], min_party_size: 1, main_dishes_limit: false, main_dishes_limit_number: 1, beverage_options: [] },
    sections: [{ id: id, title: id === 1 ? 'Arroz a elegir' : 'Principal', display_title: id === 1 ? 'Arroz a elegir' : 'Arroces', kind: id === 1 ? 'principales' : 'arroces', position: 0, annotations: [], dishes: [{ id, title: `Arroz ${id}`, description: '', supplement_enabled: false, supplement_price: null, price: null, allergens: [], position: 0, active }] }],
    show_dish_images: false, show_section_tabs: false, special_menu_sections: [], special_menu_image_url: '', menu_public_active: true, web_placement: 'inside_menus', show_menu_preview_image: false, menu_preview_image_url: '', created_at: '', modified_at: '', weekdays: {}, weekdays_available: [],
  }
}

describe('activeRiceMenus', () => {
  it('keeps the three active rice menus in editorial order and detects a rice section by title', () => {
    const current = activeRiceMenus({ '1': menu(1, 'menu-arrocero-1'), '42': menu(42, 'menu-fin-de-semana-42'), '41': menu(41, 'menu-del-dia-41'), '50': menu(50, 'other') })
    expect(current.map(({ menu }) => menu.id)).toEqual([41, 42, 1])
    expect(current[2].sections).toHaveLength(1)
  })

  it('omits inactive or privately disabled menus and inactive dishes', () => {
    const current = activeRiceMenus({ '41': menu(41, 'menu-del-dia-41'), '42': menu(42, 'menu-fin-de-semana-42', false), '1': { ...menu(1, 'menu-arrocero-1'), menu_public_active: false } })
    expect(current.map(({ menu }) => menu.id)).toEqual([41])
    expect(activeRiceMenus({ '41': menu(41, 'menu-del-dia-41', false) })).toEqual([])
  })
})
