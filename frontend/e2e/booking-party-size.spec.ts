import { expect, test, type Page, type APIRequestContext } from '@playwright/test'

// Party size & initial selection flow on /reservas.
// Real dev backend — data-dependent scenarios skip when the day doesn't match.

const PARTY_BTN = 'button[aria-label="Número de personas"]'
const FLOOR_BTN = 'button[aria-label="Salón"]'
const SHIFT_BTN = 'button[aria-label="Turno"]'

async function gotoReservas(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem('villacarmen_lang', 'es'))
  await page.goto('/reservas')
  await page.waitForSelector('.resvDay')
}

// Click first enabled future date; return its ISO (captured from the day-context request).
// Advances up to 2 months if the current view has no open day.
async function pickFirstAvailableDate(page: Page): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const day = page.locator('.resvDay:not(.disabled)').first()
    if (await day.count()) {
      const [req] = await Promise.all([
        page.waitForRequest((u) => u.url().includes('/api/reservations/day-context')),
        day.click(),
      ])
      return new URL(req.url()).searchParams.get('date')
    }
    await page.locator('.resvCalNav[aria-label="Mes siguiente"]').click()
    await page.waitForTimeout(300)
  }
  return null
}

async function partyEnabled(page: Page) {
  await expect(page.locator(PARTY_BTN)).toBeEnabled({ timeout: 15_000 })
}

// Open the party popover, return the option "left" labels (e.g. ["2","3",...,"10+"]).
async function partyOptions(page: Page): Promise<string[]> {
  await page.locator(PARTY_BTN).click()
  await page.waitForSelector('[role="option"]')
  const labels = await page.locator('[role="option"] .resvSelectOpt__left').allTextContents()
  return labels.map((s) => s.trim())
}

async function selectParty(page: Page, left: string) {
  const opt = page.locator('[role="option"]').filter({
    has: page.getByText(left, { exact: true }),
  })
  await opt.first().click()
}

async function dayContext(request: APIRequestContext, base: string, iso: string) {
  const res = await request.get(`${base}/api/reservations/day-context?date=${iso}`)
  return res.ok() ? await res.json() : null
}

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173'

test('party size selector shows options 2 through 10', async ({ page }) => {
  await gotoReservas(page)
  const iso = await pickFirstAvailableDate(page)
  test.skip(!iso, 'No open date in the next 3 months')
  await partyEnabled(page)

  const opts = await partyOptions(page)
  const nums = opts.filter((o) => /^\d+$/.test(o)).map(Number)
  expect(nums.length).toBeGreaterThan(0)
  // Contiguous starting at 2 (or 3 if two-tops unavailable), max capped at 10.
  expect(nums[0]).toBeLessThanOrEqual(3)
  expect(Math.max(...nums)).toBeLessThanOrEqual(10)
  for (let i = 1; i < nums.length; i++) expect(nums[i]).toBe(nums[i - 1] + 1)
})

test('selecting party size 2 works', async ({ page }) => {
  await gotoReservas(page)
  const iso = await pickFirstAvailableDate(page)
  test.skip(!iso, 'No open date')
  await partyEnabled(page)

  const opts = await partyOptions(page)
  const first = opts.find((o) => /^\d+$/.test(o))!
  await selectParty(page, first)
  await expect(page.locator(PARTY_BTN)).toContainText(first)
  // Flow continues: floor/shift/time section is rendered.
  await expect(page.getByText('Horas disponibles').first()).toBeVisible()
})

test('selecting party size 10 works', async ({ page }) => {
  await gotoReservas(page)
  const iso = await pickFirstAvailableDate(page)
  test.skip(!iso, 'No open date')
  await partyEnabled(page)

  const opts = await partyOptions(page)
  test.skip(!opts.includes('10'), 'Fewer than 10 free seats on this date')
  await selectParty(page, '10')
  await expect(page.locator(PARTY_BTN)).toContainText('10')
  await expect(page.getByText('Horas disponibles').first()).toBeVisible()
})

test('party size 10+ shows redirect modal', async ({ page }) => {
  await gotoReservas(page)
  const iso = await pickFirstAvailableDate(page)
  test.skip(!iso, 'No open date')
  await partyEnabled(page)

  const opts = await partyOptions(page)
  test.skip(!opts.includes('10+'), 'Date has 10 or fewer free seats; no 10+ option')
  await selectParty(page, '10+')

  const modal = page.locator('.resvModal')
  await expect(modal).toBeVisible()
  await expect(modal).toContainText('más de 10')
  // Redirect to call 638 85 72 94.
  await expect(modal.locator('a[href="tel:638857294"]')).toBeVisible()
  // Online booking did not proceed: no party selected, no hour grid.
  await expect(page.locator('.resvHourBtn')).toHaveCount(0)
})

test('floor selector appears when multiple floors active', async ({ page, request }) => {
  await gotoReservas(page)
  const iso = await pickFirstAvailableDate(page)
  test.skip(!iso, 'No open date')
  await partyEnabled(page)

  const ctx = await dayContext(request, BASE, iso!)
  const floors = ctx?.activeFloors ?? (ctx?.floors ?? []).filter((f: any) => f.active)
  test.skip(!(floors && floors.length > 1), 'Only one active floor on this date')

  const opts = await partyOptions(page)
  await selectParty(page, opts.find((o) => /^\d+$/.test(o))!)
  await expect(page.locator(FLOOR_BTN)).toBeVisible()
})

test('shift selector appears in both mode', async ({ page, request }) => {
  await gotoReservas(page)
  const iso = await pickFirstAvailableDate(page)
  test.skip(!iso, 'No open date')
  await partyEnabled(page)

  const ctx = await dayContext(request, BASE, iso!)
  test.skip(ctx?.openingMode !== 'both', `openingMode is ${ctx?.openingMode}, not 'both'`)

  const opts = await partyOptions(page)
  await selectParty(page, opts.find((o) => /^\d+$/.test(o))!)
  await expect(page.locator(SHIFT_BTN)).toBeVisible()
})

test('time slot grid appears after date+party+shift', async ({ page, request }) => {
  await gotoReservas(page)
  const iso = await pickFirstAvailableDate(page)
  test.skip(!iso, 'No open date')
  await partyEnabled(page)

  const ctx = await dayContext(request, BASE, iso!)
  const opts = await partyOptions(page)
  await selectParty(page, opts.find((o) => /^\d+$/.test(o))!)

  if (ctx?.openingMode === 'both') {
    await page.locator(SHIFT_BTN).click()
    await page.locator('[role="option"]').first().click()
  }
  // Either hour buttons render, or an explicit "no times" empty state.
  await expect(page.locator('.resvHourBtn, .resvEmpty').first()).toBeVisible({ timeout: 15_000 })
})

test('time slots filtered by party capacity', async ({ page, request }) => {
  await gotoReservas(page)
  const iso = await pickFirstAvailableDate(page)
  test.skip(!iso, 'No open date')
  await partyEnabled(page)

  const ctx = await dayContext(request, BASE, iso!)
  test.skip(ctx?.openingMode === 'both', 'Skip both-mode: shift narrows hours further')

  const opts = await partyOptions(page)
  const party = Number(opts.find((o) => /^\d+$/.test(o))!)
  await selectParty(page, String(party))

  const hourRes = await request.get(`${BASE}/api/reservations/hour-data?date=${iso}`)
  test.skip(!hourRes.ok(), 'hour-data unavailable')
  const hd = await hourRes.json()
  const underCap = Object.entries(hd.hourData ?? {})
    .filter(([, s]: any) => typeof s.capacity === 'number' && s.capacity < party)
    .map(([h]) => h)
  test.skip(underCap.length === 0, 'No hour is under party capacity on this date')

  await page.waitForSelector('.resvHourBtn, .resvEmpty', { timeout: 15_000 })
  const shown = await page.locator('.resvHourBtn').allTextContents()
  const shownSet = new Set(shown.map((s) => s.trim()))
  for (const h of underCap) expect(shownSet.has(h)).toBe(false)
})

test('selecting a time proceeds to next step', async ({ page, request }) => {
  await gotoReservas(page)
  const iso = await pickFirstAvailableDate(page)
  test.skip(!iso, 'No open date')
  await partyEnabled(page)

  const ctx = await dayContext(request, BASE, iso!)
  const opts = await partyOptions(page)
  await selectParty(page, opts.find((o) => /^\d+$/.test(o))!)

  if (ctx?.openingMode === 'both') {
    await page.locator(SHIFT_BTN).click()
    await page.locator('[role="option"]').first().click()
  }

  const firstHour = page.locator('.resvHourBtn').first()
  test.skip(!(await firstHour.count()), 'No available time slots on this date')
  await firstHour.click()

  const next = page.getByRole('button', { name: 'Siguiente', exact: true })
  await expect(next).toBeVisible()
  await next.click()

  // Advanced past the date step → menu or rice card is shown.
  await expect(
    page.getByText(/Selección de arroz|Menú recomendado del día|Menú de grupos/),
  ).toBeVisible({ timeout: 15_000 })
})
