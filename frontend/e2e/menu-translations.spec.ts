import { expect, test } from '@playwright/test'

const menuResponse = {
  success: true,
  menu: {
    id: 1,
    slug: 'menu-prueba-1',
    menu_title: 'Menú de prueba',
    menu_title_english: 'Test Menu',
    menu_type: 'closed_conventional',
    price: '35.00',
    active: true,
    menu_subtitle: ['(A partir de 7 personas)'],
    menu_subtitle_english: ['(From 7 people)'],
    entrantes: ['Croqueta de carrillada'],
    principales: {
      titulo_principales: 'Principal a elegir',
      items: ['Merluza al horno'],
    },
    postre: ['Tarta de queso'],
    settings: {
      included_coffee: false,
      beverage: { type: 'no_incluida' },
      comments: ['Bebida no incluida'],
      comments_english: ['Drinks not included'],
      min_party_size: 7,
      main_dishes_limit: false,
      main_dishes_limit_number: 1,
    },
    sections: [
      {
        id: 0,
        title: 'Entrantes',
        title_english: 'Starters',
        kind: 'entrantes',
        position: 0,
        annotations: ['Para compartir'],
        annotations_english: ['To share'],
        dishes: [
          {
            id: 0,
            title: 'Croqueta de carrillada',
            title_english: 'Braised beef cheek croquette',
            description: '',
            allergens: [],
            supplement_enabled: true,
            supplement_price: 4,
            price: null,
            position: 0,
          },
          {
            id: 0,
            title: 'Sin suplemento',
            title_english: 'No supplement',
            description: '',
            allergens: [],
            supplement_enabled: true,
            supplement_price: null,
            price: null,
            position: 1,
          },
        ],
      },
      {
        id: 0,
        title: 'Arroz a elegir',
        title_english: 'Rice of your choice',
        kind: 'principales',
        position: 1,
        annotations: [],
        dishes: [
          {
            id: 0,
            title: 'Merluza al horno',
            title_english: 'Baked hake',
            description: '',
            allergens: [],
            supplement_enabled: false,
            supplement_price: null,
            price: null,
            position: 0,
          },
        ],
      },
      {
        id: 0,
        title: 'Postres',
        title_english: 'Desserts',
        kind: 'postres',
        position: 2,
        annotations: [],
        dishes: [
          {
            id: 0,
            title: 'Tarta de queso',
            title_english: 'Cheesecake',
            description: '',
            allergens: [],
            supplement_enabled: false,
            supplement_price: null,
            price: null,
            position: 0,
          },
        ],
      },
    ],
    show_dish_images: false,
    special_menu_image_url: '',
    show_menu_preview_image: false,
    menu_preview_image_url: '',
    created_at: '',
    modified_at: '',
  },
}

test('home menu translations render after mobile English switch', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('villacarmen_lang', 'es'))
  await page.route('**/api/menus/sidebar', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, menus: [], cafe_page_active: true, bebidas_page_active: true }),
    })
  })
  await page.route('**/api/menus/home', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        count: 1,
        menus: [{
          id: 2,
          slug: 'menu-mediterraneo-2',
          menu_title: 'Menú Mediterráneo',
          menu_title_english: 'Mediterranean Menu',
          menu_type: 'closed_conventional',
          active: true,
          menu_subtitle: ['A partir de 7 personas'],
          menu_subtitle_english: ['From 7 people'],
          show_menu_preview_image: false,
          menu_preview_image_url: '',
        }],
      }),
    })
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 3, name: 'Menú Mediterráneo' })).toBeVisible()
  await expect(page.getByText('A partir de 7 personas', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await page.keyboard.press('Escape')

  await expect(page.getByRole('heading', { level: 3, name: 'Mediterranean Menu' })).toBeVisible()
  await expect(page.getByText('From 7 people', { exact: true })).toBeVisible()
})

test('menu translations: API fields render after mobile English switch', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem('villacarmen_lang', 'es'))
  await page.route('**/api/menus/sidebar', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ success: true, menus: [], cafe_page_active: true, bebidas_page_active: true }),
    })
  })
  await page.route('**/api/menus/1', async (route) => {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(menuResponse) })
  })

  const menuRequest = page.waitForResponse('**/api/menus/1')
  await page.goto('/menu/1/menu-prueba-1')

  const apiPayload = await (await menuRequest).json()
  expect(apiPayload.menu.menu_title_english).toBe('Test Menu')
  expect(apiPayload.menu.sections[0].dishes[0].title_english).toBe('Braised beef cheek croquette')

  await expect(page.getByRole('heading', { level: 1, name: 'Menú de prueba' })).toBeVisible()
  await expect(page.getByText('Croqueta de carrillada', { exact: true })).toBeVisible()
  await expect(page.getByText('Suplemento +4€', { exact: true })).toBeVisible()
  await expect(page.getByTestId('dish-supplement')).toHaveCount(1)

  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await page.keyboard.press('Escape')

  await expect(page.getByRole('heading', { level: 1, name: 'Test Menu' })).toBeVisible()
  await expect(page.getByText('(From 7 people)', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Starters' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Rice of your choice' })).toBeVisible()
  await expect(page.getByText('Braised beef cheek croquette', { exact: true })).toBeVisible()
  await expect(page.getByText('Baked hake', { exact: true })).toBeVisible()
  await expect(page.getByText('To share', { exact: true })).toBeVisible()
  await expect(page.getByText('Supplement +4€', { exact: true })).toBeVisible()
  await expect(page.getByTestId('dish-supplement')).toHaveCount(1)
  await expect(page.getByText('Croqueta de carrillada', { exact: true })).not.toBeVisible()
})
