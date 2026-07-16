import { expect, test, type Page, type APIRequestContext } from '@playwright/test'

// Happy path: full booking, 2 people, no extras. Runs against the live dev backend.
// ponytail: drives real UI (no mocks per instructions); best-effort cancel cleanup.

const createdIds: number[] = []

test.describe.configure({ mode: 'serial', timeout: 120_000 })

// Pick a bookable date in the calendar: first enabled in-month day, hop months if none.
async function pickFirstOpenDate(page: Page) {
  for (let hop = 0; hop < 3; hop++) {
    const day = page.locator('.resvDay:not(.disabled):not(.other)').first()
    if (await day.count()) {
      const ctx = page.waitForResponse((r) => r.url().includes('/api/reservations/day-context'))
      await day.click()
      await ctx
      return
    }
    await page.getByRole('button', { name: 'Mes siguiente' }).click()
    await page.waitForResponse((r) => r.url().includes('/api/reservations/month-availability')).catch(() => {})
    await page.waitForTimeout(300)
  }
  throw new Error('No open date found within 3 months')
}

async function selectPopoverOption(page: Page, ariaLabel: string, leftText: string) {
  await page.getByRole('button', { name: ariaLabel, exact: true }).click()
  await page
    .locator('.resvSelectOpt')
    .filter({ has: page.locator('.resvSelectOpt__left', { hasText: leftText }) })
    .first()
    .click()
}

// Full wizard for 2 guests, no rice/menu/kids. Returns parsed POST /api/bookings/front body.
async function completeBooking(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' }) // kill 2s smooth-scroll → stable buttons
  await page.addInitScript(() => window.localStorage.setItem('villacarmen_lang', 'es'))
  const monthResp = page.waitForResponse((r) => r.url().includes('/api/reservations/month-availability'))
  await page.goto('/reservas')
  // Calendar populated by month-availability.
  await monthResp
  await expect(page.locator('.resvCalDays')).toBeVisible()

  await pickFirstOpenDate(page)

  // Party size 2 (options appear once freeSeats loads).
  const partyBtn = page.getByRole('button', { name: 'Número de personas', exact: true })
  await expect(partyBtn).toBeEnabled()
  await selectPopoverOption(page, 'Número de personas', '2')

  // Floor selector only shows when >1 active floor.
  const floorBtn = page.getByRole('button', { name: 'Salón', exact: true })
  if (await floorBtn.count()) await selectPopoverOption(page, 'Salón', '')
  // Shift selector only when openingMode === 'both'.
  const shiftBtn = page.getByRole('button', { name: 'Turno', exact: true })
  if (await shiftBtn.count()) {
    await shiftBtn.click()
    await page.locator('.resvSelectOpt').first().click()
  }

  // Time slot.
  const slot = page.locator('.resvHourBtn').first()
  await expect(slot).toBeVisible()
  await slot.click()

  // Next off date step (may go to mandatoryMenu / groupMenu / rice).
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()

  // If a mandatory-menu step appears, skip it (no mandatory menu expected on dev).
  const skipMandatory = page.getByRole('button', { name: 'Continuar sin reservar menú recomendado' })
  if (await skipMandatory.count()) await skipMandatory.click()

  // Group menu step: choose "No" if present.
  const noBtns = page.locator('.resvChoice', { hasText: 'No' })
  // Rice step OR group-menu step both use "No". Click whichever "No" is visible, then Next, repeatedly.
  for (let i = 0; i < 3; i++) {
    if (await page.locator('.resvInput').count()) break // reached personal step
    const no = noBtns.first()
    if (await no.count()) await no.click()
    const next = page.getByRole('button', { name: 'Siguiente', exact: true })
    if (await next.count()) await next.click()
    await page.waitForTimeout(200)
  }

  // Personal data.
  await page.locator('input.resvInput[autocomplete="name"]').fill('E2E Test User')
  await page.locator('input.resvInput[type="email"]').fill('e2e-test@example.com')
  await page.locator('input.resvInput[type="tel"]').fill('666666666')
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()

  // Adults step: default already = partySize (2), no children. Just continue.
  await expect(page.getByText('¿Cuántos adultos sois?')).toBeVisible()
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()

  // Summary: no accessories step (no children). Accept terms + privacy.
  await expect(page.getByText('Resumen de tu reserva')).toBeVisible()
  const checks = page.locator('.resvCheckbox')
  await expect(checks).toHaveCount(2)
  await checks.nth(0).click()
  await checks.nth(1).click()

  // Backend rejects submissions faster than a human (form_load_time set at mount). Wait it out.
  await page.waitForTimeout(6000)
  // Backend rate-limits booking POSTs (429). Retry the submit with backoff.
  let resp, body
  for (let attempt = 0; attempt < 5; attempt++) {
    const respPromise = page.waitForResponse((r) => r.url().includes('/api/bookings/front') && r.request().method() === 'POST')
    await page.getByRole('button', { name: 'Completar reserva' }).click()
    resp = await respPromise
    body = await resp.json().catch(() => null)
    if (resp.status() !== 429) break
    await page.waitForTimeout(15000)
  }
  console.log('booking POST', resp!.status(), JSON.stringify(body))
  if (typeof body?.booking_id === 'number') createdIds.push(body.booking_id)
  return { resp: resp!, body }
}

test.afterAll(async ({ playwright }) => {
  if (!createdIds.length) return
  const base = process.env.PLAYWRIGHT_BASE_URL
  if (!base) return
  const req: APIRequestContext = await playwright.request.newContext({ baseURL: base })
  for (const id of createdIds) {
    await req.post('/api/public/booking/cancel', { data: { id, cancelledBy: 'customer' } }).catch(() => {})
  }
  await req.dispose()
})

test('complete booking for 2 people end-to-end', async ({ page }) => {
  const { resp, body } = await completeBooking(page)
  expect(resp.ok()).toBeTruthy()
  expect(body.success).toBe(true)
  expect(typeof body.booking_id).toBe('number')
  // Success modal confirms it end-to-end.
  await expect(page.locator('.resvConfirm')).toBeVisible()
})

test('booking response has correct shape', async ({ page }) => {
  const { body } = await completeBooking(page)
  const ok = body?.success === true || body?.status === 'success'
  expect(ok).toBeTruthy()
  expect(body.booking_id ?? body.id ?? body.bookingId).toBeTruthy()
})
