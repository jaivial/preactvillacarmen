import { describe, it, expect } from 'vitest'
import type { PublicMenu, PublicBeverageOption } from '../../../lib/types'
import { menuBeverageNote } from '../../../lib/menuBeverageNote'

/**
 * Regression suite for the parenthetical beverage line rendered on the
 * public menu routes (MenusDeGruposCarta + MenuCartaConvencional).
 *
 * Before this helper existed, each route carried its own copy of the
 * rendering logic. The parenthetical list of allowed beverages always
 * came back as a hardcoded 4-default fallback because the public
 * backend didn't expose any `beverage_options` list and the per-route
 * helpers couldn't be unit-tested in isolation.
 *
 * After the fix:
 *  - One shared `menuBeverageNote(menu, lang)` lives in
 *    `frontend/src/lib/menuBeverageNote.ts`.
 *  - When the backend returns the full `menu.settings.beverage_options`
 *    list (defaults + operator-added customs), the parenthetical list
 *    includes every selected beverage by name.
 */

type Settings = PublicMenu['settings']

const beverage = (overrides: Partial<PublicBeverageOption> = {}): PublicBeverageOption => ({
  id: 1,
  slug: 'agua',
  name: 'Agua',
  is_custom: false,
  selected: true,
  ...overrides,
})

const baseMenu = (settingsOverrides: Partial<Settings> = {}): PublicMenu => ({
  id: 1,
  slug: 'menu-test-1',
  menu_title: 'Menu de prueba',
  menu_title_english: 'Test menu',
  menu_type: 'closed_group',
  price: '35',
  active: true,
  menu_subtitle: [],
  menu_subtitle_english: [],
  entrantes: [],
  principales: { titulo_principales: 'Principal', items: [] },
  postre: [],
  settings: {
    included_coffee: false,
    beverage: { type: 'opcion', price_per_person: 8, has_supplement: false, supplement_price: null },
    beverage_options: [],
    comments: [],
    min_party_size: 6,
    main_dishes_limit: false,
    main_dishes_limit_number: 1,
    ...settingsOverrides,
  },
  sections: [],
  show_dish_images: false,
  show_menu_preview_image: false,
  menu_preview_image_url: '',
  special_menu_image_url: '',
  created_at: '',
  modified_at: '',
})

describe('menuBeverageNote — shared helper used by both public routes', () => {
  it('lists every selected beverage, including custom ones the operator added', () => {
    const menu = baseMenu({
      beverage: { type: 'opcion', price_per_person: 8, has_supplement: false, supplement_price: null },
      beverage_options: [
        beverage({ id: 1, slug: 'agua', name: 'Agua', selected: true }),
        beverage({ id: 2, slug: 'refrescos', name: 'Refrescos', selected: true }),
        beverage({ id: 3, slug: 'vino', name: 'Vino', selected: true }),
        beverage({ id: 4, slug: 'cerveza-de-barril', name: 'Cerveza de barril', selected: true }),
        // operator-created custom beverage that they have toggled on
        beverage({ id: 64, slug: 'bebida-inventada', name: 'Bebida inventada', is_custom: true, selected: true }),
        beverage({ id: 65, slug: 'hola-test', name: 'hola test', is_custom: true, selected: false }),
      ],
    })

    expect(menuBeverageNote(menu)).toBe(
      'Opción de bebida ilimitada (Agua, Refrescos, Vino, Cerveza de barril, Bebida inventada)',
    )
  })

  it('falls back to a no-parens string when no beverages are selected', () => {
    const menu = baseMenu({
      beverage: { type: 'opcion', price_per_person: 8, has_supplement: false, supplement_price: null },
      beverage_options: [],
    })
    expect(menuBeverageNote(menu)).toBe('Opción de bebida ilimitada')
  })

  it('uses the ilimitada label for type="ilimitada"', () => {
    const menu = baseMenu({
      beverage: { type: 'ilimitada', price_per_person: 10, has_supplement: false, supplement_price: null },
      beverage_options: [
        beverage({ id: 1, name: 'Agua', selected: true }),
        beverage({ id: 64, slug: 'cava', name: 'Cava', is_custom: true, selected: true }),
      ],
    })
    expect(menuBeverageNote(menu)).toBe('Bebida ilimitada (Agua, Cava)')
  })

  it('also accepts the legacy "option" alias for opcion', () => {
    const menu = baseMenu({
      beverage: { type: 'option', price_per_person: 8, has_supplement: false, supplement_price: null },
      beverage_options: [beverage({ name: 'Agua' })],
    })
    expect(menuBeverageNote(menu)).toBe('Opción de bebida ilimitada (Agua)')
  })

  it('returns "Bebida no incluida" when type is no_incluida regardless of options', () => {
    const menu = baseMenu({
      beverage: { type: 'no_incluida', price_per_person: null, has_supplement: false, supplement_price: null },
      beverage_options: [beverage({ name: 'Agua' })],
    })
    expect(menuBeverageNote(menu)).toBe('Bebida no incluida')
  })

  it('drops rows with selected: false even if they exist in the array', () => {
    const menu = baseMenu({
      beverage_options: [
        beverage({ id: 1, name: 'Agua', selected: true }),
        beverage({ id: 2, name: 'Refrescos', selected: false }),
        beverage({ id: 3, name: 'Vino', selected: true }),
      ],
    })
    expect(menuBeverageNote(menu)).toBe('Opción de bebida ilimitada (Agua, Vino)')
  })

  it('treats missing `selected` field as selected (matches backend public-API shape)', () => {
    const menu = baseMenu({
      beverage_options: [{ slug: 'agua', name: 'Agua' }, { slug: 'vino', name: 'Vino' }],
    })
    expect(menuBeverageNote(menu)).toBe('Opción de bebida ilimitada (Agua, Vino)')
  })

  it('does not crash on empty/missing beverage_options array', () => {
    const menu = baseMenu({ beverage_options: [] })
    expect(menuBeverageNote(menu)).toBe('Opción de bebida ilimitada')
  })

  it('returns the English label when lang="en"', () => {
    const menu = baseMenu({
      beverage: { type: 'ilimitada', price_per_person: 8, has_supplement: false, supplement_price: null },
      beverage_options: [beverage({ name: 'Water' }), beverage({ id: 64, name: 'Cava', is_custom: true })],
    })
    expect(menuBeverageNote(menu, 'en')).toBe('Unlimited drinks (Water, Cava)')
  })
})
