import { expect, test } from '@playwright/test'

function menuResponse(showDishImages: boolean) {
  return {
    success: true,
    menu: {
      id: 7,
      slug: 'menu-boton-plato',
      menu_title: 'Menu de prueba',
      menu_type: 'closed_conventional',
      price: '35.00',
      active: true,
      menu_subtitle: [],
      entrantes: [],
      principales: { titulo_principales: '', items: [] },
      postre: [],
      settings: {
        included_coffee: false,
        beverage: { type: 'no_incluida' },
        comments: [],
        min_party_size: 1,
        main_dishes_limit: false,
        main_dishes_limit_number: 1,
      },
      sections: [
        {
          id: 1,
          title: 'Entrantes',
          kind: 'entrantes',
          position: 0,
          annotations: [],
          dishes: [
            {
              id: 1,
              title: 'Croqueta de carrillada con una descripcion muy larga para comprobar el ajuste del boton',
              description:
                'Descripcion extensa que ocupa varias lineas y debe conservar todo su espacio dentro de la tarjeta sin quedar cubierta por el boton de anadir.',
              allergens: ['Gluten', 'Leche'],
              supplement_enabled: true,
              supplement_price: 4,
              price: null,
              position: 0,
            },
          ],
        },
        {
          id: 2,
          title: 'Principales',
          kind: 'principales',
          position: 1,
          annotations: [],
          dishes: [
            {
              id: 2,
              title: 'Merluza al horno',
              description: 'Plato de prueba.',
              allergens: [],
              supplement_enabled: false,
              supplement_price: null,
              price: null,
              position: 0,
            },
          ],
        },
        {
          id: 3,
          title: 'Arroces',
          kind: 'arroces',
          position: 2,
          annotations: [],
          dishes: [
            {
              id: 3,
              title: 'Arroz de verduras',
              description: 'Plato de prueba.',
              allergens: [],
              supplement_enabled: false,
              supplement_price: null,
              price: null,
              position: 0,
            },
          ],
        },
      ],
      show_dish_images: showDishImages,
      special_menu_image_url: '',
      show_menu_preview_image: false,
      menu_preview_image_url: '',
      created_at: '',
      modified_at: '',
    },
  }
}

const viewports = [
  { name: 'mobile', size: { width: 390, height: 844 } },
  { name: 'desktop', size: { width: 1280, height: 900 } },
] as const

const cardLayouts = [
  { name: 'text-only cards', showDishImages: false },
  { name: 'image cards', showDishImages: true },
] as const

for (const viewport of viewports) {
  for (const cardLayout of cardLayouts) {
    test(`dish add buttons keep content clear in ${cardLayout.name} at ${viewport.name} width`, async ({ page }) => {
      await page.setViewportSize(viewport.size)
      await page.addInitScript(() => window.localStorage.setItem('villacarmen_lang', 'es'))
      await page.route('**/api/menus/sidebar', async (route) => {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ success: true, menus: [], cafe_page_active: true, bebidas_page_active: true }),
        })
      })
      await page.route('**/api/menus/7', async (route) => {
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(menuResponse(cardLayout.showDishImages)) })
      })

      await page.goto('/menu/7/menu-boton-plato')

      const cards = page.locator('.dishCard--pickable')
      await expect(cards).toHaveCount(3)

      const placements = await cards.evaluateAll((dishCards) =>
        dishCards.map((card) => {
          const action = card.querySelector<HTMLButtonElement>('.dishAddBtn')
          if (!action) throw new Error('Dish card add button is missing')

          // Check overlap against each text-bearing descendant instead of the
          // body container — the body container's bounding box extends behind
          // the absolutely-positioned button by design; only text content must
          // stay clear.
          const textNodes = card.querySelectorAll<HTMLElement>(
            '.dishDescription, .dishDescriptionExtra, .dishSupplementInfo, .dishAllergenRow',
          )
          const actionRect = action.getBoundingClientRect()
          const overlapsAnyText = Array.from(textNodes).some((node) => {
            const r = node.getBoundingClientRect()
            return (
              actionRect.left < r.right &&
              actionRect.right > r.left &&
              actionRect.top < r.bottom &&
              actionRect.bottom > r.top
            )
          })

          const cardRect = card.getBoundingClientRect()
          return {
            position: getComputedStyle(action).position,
            overlapsAnyText,
            rightGap: cardRect.right - actionRect.right,
            bottomGap: cardRect.bottom - actionRect.bottom,
          }
        }),
      )

      for (const placement of placements) {
        expect(placement.position).toBe('absolute')
        expect(placement.overlapsAnyText).toBe(false)
        // Absolute bottom-right: the button's right/bottom edges sit flush with
        // the card's content-box edge (i.e. `right: 0; bottom: 0` of the .dishCard's
        // padding box). With the .dishCard's 1rem of internal padding, the visual
        // inset from the card chrome is at most 16px; allow up to 17 to account
        // for sub-pixel rounding.
        expect(placement.rightGap).toBeGreaterThanOrEqual(-1)
        expect(placement.rightGap).toBeLessThanOrEqual(17)
        expect(placement.bottomGap).toBeGreaterThanOrEqual(-1)
        expect(placement.bottomGap).toBeLessThanOrEqual(17)
      }

      await cards.first().getByRole('button', { name: 'Añadir a tu lista' }).click()
      await expect(page.getByRole('button', { name: 'Ver tu lista' })).toBeVisible()
    })
  }
}
