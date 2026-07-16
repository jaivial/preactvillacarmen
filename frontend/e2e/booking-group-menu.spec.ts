import { expect, test, type Page } from '@playwright/test'

// Group-menu flow. The groupMenu step only appears when the backend returns
// valid group menus for the chosen party size. On the dev server this data may
// not exist — probe the API in beforeAll and skip the whole suite if so, rather
// than assert against a wizard branch that never renders.
// ponytail: real-backend driver, no mocks; skips clean when dev has no menus.

const PARTY_SIZE = 4

type GroupMenusResponse = { hasValidMenus?: boolean; menus?: { id: number }[] | null }

let hasGroupMenus = false

test.beforeAll(async ({ request, baseURL }) => {
  const res = await request.get(`${baseURL}/api/reservations/group-menus?party_size=${PARTY_SIZE}`)
  if (!res.ok()) return
  const data = (await res.json()) as GroupMenusResponse
  hasGroupMenus = data.hasValidMenus === true && Array.isArray(data.menus) && data.menus.length > 0
})

// Pick the first bookable calendar day, advancing month up to 2x (max 40 days ahead).
async function pickFirstBookableDate(page: Page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const day = page.locator('.resvDay:not(.disabled):not(.other)').first()
    if (await day.count()) {
      await day.click()
      return
    }
    await page.getByRole('button', { name: /Mes siguiente|Next month/ }).click()
    await page.waitForTimeout(400)
  }
  throw new Error('No bookable date found in calendar')
}

// Choose a numeric option from a PopoverSelect by its aria-label.
async function pickPopoverNumber(page: Page, ariaLabel: RegExp, value: number) {
  await page.getByRole('button', { name: ariaLabel }).click()
  await page.getByRole('option').filter({ hasText: new RegExp(`^${value}\\D`) }).first().click()
}

// Drive date → party → (floor/shift) → time → Siguiente, landing on the groupMenu step.
// Returns false if the groupMenu step did not appear (no menus for this date/party).
async function reachGroupMenuStep(page: Page): Promise<boolean> {
  await page.addInitScript(() => window.localStorage.setItem('villacarmen_lang', 'es'))
  await page.goto('/reservas')

  await pickFirstBookableDate(page)
  await pickPopoverNumber(page, /Número de personas|Number of guests/, PARTY_SIZE)

  // Optional floor selector (only if >1 active floor).
  const floorBtn = page.getByRole('button', { name: /^Salón$|Dining room/ })
  if (await floorBtn.count()) {
    await floorBtn.first().click()
    await page.getByRole('option').first().click()
  }
  // Optional shift selector (only when openingMode === 'both').
  const shiftBtn = page.getByRole('button', { name: /^Turno$|^Service$/ })
  if (await shiftBtn.count()) {
    await shiftBtn.first().click()
    await page.getByRole('option').first().click()
  }

  const hour = page.locator('.resvHourBtn').first()
  await expect(hour).toBeVisible()
  await hour.click()

  await page.getByRole('button', { name: /Siguiente|Next/ }).click()

  // groupMenu step shows the "Menú de grupos" card with Sí/No choices.
  const groupCard = page.getByText('Menú de grupos', { exact: true })
  return (await groupCard.count()) > 0
}

test.describe('booking group-menu flow', () => {
  test.beforeEach(() => {
    test.skip(!hasGroupMenus, 'No valid group menus on dev server for party_size=' + PARTY_SIZE)
  })

  test('group menu step appears when menus available', async ({ page }) => {
    expect(await reachGroupMenuStep(page)).toBe(true)
    await expect(page.getByRole('button', { name: 'Sí', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'No', exact: true })).toBeVisible()
  })

  test('choosing no group menu skips to rice step', async ({ page }) => {
    expect(await reachGroupMenuStep(page)).toBe(true)
    await page.getByRole('button', { name: 'No', exact: true }).click()
    await page.getByRole('button', { name: /Siguiente|Next/ }).click()
    await expect(page.getByText('Selección de arroz', { exact: true })).toBeVisible()
  })

  test('choosing yes shows menu selector', async ({ page }) => {
    expect(await reachGroupMenuStep(page)).toBe(true)
    await page.getByRole('button', { name: 'Sí', exact: true }).click()
    await expect(page.getByRole('button', { name: /Seleccione un menú|Select a menu/ })).toBeVisible()
  })

  test('selecting a menu shows principales counters', async ({ page }) => {
    expect(await reachGroupMenuStep(page)).toBe(true)
    await page.getByRole('button', { name: 'Sí', exact: true }).click()
    await page.getByRole('button', { name: /Seleccione un menú|Select a menu/ }).click()
    await page.getByRole('option').first().click()
    // Enable the principales chooser (second Sí is inside the menu details block).
    await page.getByRole('button', { name: '¿Queréis elegir ahora los principales?' }).count()
    await page.locator('.resvMenuBlock').getByRole('button', { name: 'Sí', exact: true }).click()
    await expect(page.locator('[data-ui="inline-counter"]').first()).toBeVisible()
    await expect(page.locator('[data-ui="principal-row"]').first()).toBeVisible()
  })

  test('principales counters can increment within party size', async ({ page }) => {
    expect(await reachGroupMenuStep(page)).toBe(true)
    await page.getByRole('button', { name: 'Sí', exact: true }).click()
    await page.getByRole('button', { name: /Seleccione un menú|Select a menu/ }).click()
    await page.getByRole('option').first().click()
    await page.locator('.resvMenuBlock').getByRole('button', { name: 'Sí', exact: true }).click()

    const row = page.locator('[data-ui="principal-row"]').first()
    await row.getByRole('button', { name: /Selecciona un principal|Select a main course/ }).click()
    await page.getByRole('option').first().click()

    const counter = page.locator('[data-ui="inline-counter"]').first()
    const inc = counter.getByRole('button', { name: /^Aumentar/ })
    const valueText = counter.locator('.resvInlineCounter__value')
    await inc.click()
    await expect(valueText).toHaveText('1')
  })

  test('cannot exceed party size in principales sum', async ({ page }) => {
    expect(await reachGroupMenuStep(page)).toBe(true)
    await page.getByRole('button', { name: 'Sí', exact: true }).click()
    await page.getByRole('button', { name: /Seleccione un menú|Select a menu/ }).click()
    await page.getByRole('option').first().click()
    await page.locator('.resvMenuBlock').getByRole('button', { name: 'Sí', exact: true }).click()

    const row = page.locator('[data-ui="principal-row"]').first()
    await row.getByRole('button', { name: /Selecciona un principal|Select a main course/ }).click()
    await page.getByRole('option').first().click()

    // InlineCounter max is party_size; the + button disables once value hits it.
    const counter = page.locator('[data-ui="inline-counter"]').first()
    const inc = counter.getByRole('button', { name: /^Aumentar/ })
    for (let i = 0; i < PARTY_SIZE + 2; i++) {
      if (await inc.isDisabled()) break
      await inc.click()
    }
    await expect(counter.locator('.resvInlineCounter__value')).toHaveText(String(PARTY_SIZE))
    await expect(inc).toBeDisabled()
  })

  test('completes booking with group menu', async ({ page }) => {
    expect(await reachGroupMenuStep(page)).toBe(true)
    await page.getByRole('button', { name: 'Sí', exact: true }).click()
    await page.getByRole('button', { name: /Seleccione un menú|Select a menu/ }).click()
    await page.getByRole('option').first().click()
    await page.getByRole('button', { name: /Siguiente|Next/ }).click()

    // personal
    await page.locator('input[autocomplete="name"]').fill('E2E Group Menu')
    await page.locator('input[type="email"]').fill('e2e-group@example.com')
    await page.locator('input[autocomplete="tel-national"]').fill('600123456')
    await page.getByRole('button', { name: /Siguiente|Next/ }).click()

    // adults
    await page.getByRole('button', { name: /Siguiente|Next/ }).click()

    // summary — accept terms, submit
    await page.locator('.resvCheck').nth(0).click()
    await page.locator('.resvCheck').nth(1).click()
    const bookingResponse = page.waitForResponse('**/api/bookings/front')
    await page.getByRole('button', { name: /Completar reserva|Complete reservation/ }).click()
    const res = await bookingResponse
    const body = await res.json()
    expect(body.success).toBe(true)
    await expect(page.locator('.resvConfirm')).toBeVisible()
  })
})
