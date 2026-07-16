import { expect, test, type Page, type APIRequestContext } from '@playwright/test'

// Mandatory menus are date-specific (mandatory_menus table). We probe the live API
// for a date in the next 40 days that has one configured. If none exist on the dev
// server, every test skips — the flow is unreachable without configured data.

type MandatoryMenu = {
  menuId: number
  menuTitle: string
  menuType: string
  menuChooseMain: boolean
}
type MandatoryMenuResponse = { date: string; status: boolean; mandatory?: boolean; menus?: MandatoryMenu[] }

function iso(daysAhead: number) {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + daysAhead)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Filled by beforeAll. null = no mandatory-menu date found → skip.
let found: { date: string; data: MandatoryMenuResponse } | null = null

async function findMandatoryMenuDate(request: APIRequestContext) {
  for (let i = 1; i <= 40; i++) {
    const date = iso(i)
    const res = await request.get(`/api/reservations/mandatory-menus?date=${date}`)
    if (!res.ok()) continue
    const data = (await res.json()) as MandatoryMenuResponse
    if (data.status === true && data.menus && data.menus.length > 0) return { date, data }
  }
  return null
}

// Pick a party size the day actually has hours for, then reach the mandatoryMenu step.
async function gotoDateAndSelectTime(page: Page, date: string) {
  await page.addInitScript(() => window.localStorage.setItem('villacarmen_lang', 'es'))
  await page.goto('/reservas')

  // Ensure the month view shows the target date's month (calendar starts on current month).
  const [y, m] = date.split('-').map(Number)
  const now = new Date()
  const monthsForward = (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth())
  for (let i = 0; i < monthsForward; i++) {
    await page.getByRole('button', { name: 'Mes siguiente' }).click()
  }

  // Click the day cell (enabled buttons only).
  const day = String(Number(date.split('-')[2]))
  const dayBtn = page.locator('.resvDay:not(.other):not(.disabled)', { hasText: new RegExp(`^${day}$`) }).first()
  await dayBtn.click()

  // Party size popover: open, choose first available option (2..10).
  const partySelect = page.getByLabel('Número de personas')
  await expect(partySelect).toBeEnabled({ timeout: 15_000 })
  await partySelect.click()
  await page.locator('[role="option"]').first().click()

  // Shift selector may appear (openingMode 'both'); pick lunch if present.
  const shift = page.getByLabel('Turno')
  if (await shift.count()) {
    await shift.click()
    await page.getByRole('option', { name: 'Comida' }).click()
  }

  // Time slots.
  const hour = page.locator('.resvHourBtn').first()
  await expect(hour).toBeVisible({ timeout: 15_000 })
  await hour.click()

  // Next → triggers mandatory-menu lookup and advances the wizard.
  await page.getByRole('button', { name: 'Siguiente' }).click()
}

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://preact-dev.menustudioai.com',
  })
  found = await findMandatoryMenuDate(request)
  await request.dispose()
})

test.describe('mandatory menu flow', () => {
  test('mandatory menu step appears for configured date', async ({ page }) => {
    test.skip(!found, 'No date with a mandatory menu on the dev server')
    await gotoDateAndSelectTime(page, found!.date)
    // Forced menu step: title is the mandatory-menu card, and the menu popover exists.
    await expect(page.getByText('Menú recomendado del día')).toBeVisible()
    await expect(page.getByLabel('Seleccione un menú')).toBeVisible()
  })

  test('mandatory menu forces selection before proceeding', async ({ page }) => {
    test.skip(!found, 'No date with a mandatory menu on the dev server')
    test.skip(found?.data.mandatory !== true, 'Menu configured but not forced (mandatory=false)')
    await gotoDateAndSelectTime(page, found!.date)
    await expect(page.getByText('Menú recomendado del día')).toBeVisible()
    // No menu selected yet → the Next button is not rendered (mandatoryMenuStepReady=false).
    // There is also no group-menu-style "No" option to skip.
    const card = page.locator('.resvCard')
    await expect(card.getByRole('button', { name: 'Siguiente' })).toHaveCount(0)
    await expect(card.getByRole('button', { name: 'No' })).toHaveCount(0)
  })

  test('selecting mandatory menu shows main dish selection', async ({ page }) => {
    test.skip(!found, 'No date with a mandatory menu on the dev server')
    const menu = found?.data.menus?.[0]
    test.skip(!menu?.menuChooseMain, 'First mandatory menu does not enable main dish choice')
    await gotoDateAndSelectTime(page, found!.date)
    await page.getByLabel('Seleccione un menú').click()
    await page.locator('[role="option"]').first().click()
    // menuChooseMain enabled → "Principales" block with a yes/no choice appears.
    await expect(page.getByText('Principales', { exact: true })).toBeVisible()
    await expect(page.getByText('¿Queréis elegir ahora los principales?')).toBeVisible()
  })

  test('completes booking with mandatory menu', async ({ page }) => {
    test.skip(!found, 'No date with a mandatory menu on the dev server')
    await gotoDateAndSelectTime(page, found!.date)

    // Select mandatory menu (forced — no skip).
    await page.getByLabel('Seleccione un menú').click()
    await page.locator('[role="option"]').first().click()
    // Skip choosing individual mains if offered.
    const noMains = page.locator('.resvCard').getByRole('button', { name: 'No' })
    if (await noMains.count()) await noMains.first().click()
    await page.locator('.resvCard').getByRole('button', { name: 'Siguiente' }).click()

    // Personal step. Unique email avoids dedupe collisions.
    await page.getByRole('textbox').filter({ hasText: '' }).first().waitFor()
    await page.locator('input.resvInput[type="text"]').fill('Test Mandatory E2E')
    await page.locator('input.resvInput[type="email"]').fill(`e2e.mandatory.${iso(1).replace(/-/g, '')}@example.com`)
    await page.locator('input.resvInput[type="tel"]').fill('600123456')
    await page.locator('.resvCard').getByRole('button', { name: 'Siguiente' }).click()

    // Adults step → all adults (no accessories path).
    await page.locator('.resvCard').getByRole('button', { name: 'Siguiente' }).click()

    // Summary: accept terms + submit.
    await expect(page.getByText('Resumen de tu reserva')).toBeVisible()
    const checks = page.locator('.resvCheck')
    await checks.nth(0).click()
    await checks.nth(1).click()
    await page.getByRole('button', { name: 'Completar reserva' }).click()

    // Success modal.
    await expect(page.locator('.resvConfirm')).toBeVisible({ timeout: 20_000 })
  })
})
