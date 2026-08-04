import { expect, test, type Page, type APIRequestContext } from '@playwright/test'

// Happy path: full booking, 2 people, no extras. Runs against the live dev backend.
// ponytail: drives real UI (no mocks per instructions); best-effort cancel cleanup.

const createdIds: number[] = []

test.describe.configure({ mode: 'serial', timeout: 120_000 })

// Pick a bookable date in the calendar: first enabled in-month day, hop months if none.
async function pickFirstOpenDate(page: Page) {
  for (let hop = 0; hop < 3; hop++) {
    const day = page.locator('.resvDay:not(.disabled):not(.other):not(.today)').first()
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

  // Rice / group-menu steps both answer "No". goNextFromDate runs async fetches before
  // switching step, so wait for the active step to actually change instead of polling a
  // mid-transition DOM (count() can see the stale date card and miss the choice buttons).
  for (let i = 0; i < 3; i++) {
    await page.waitForFunction(
      () => {
        const dot = document.querySelector('.resvDot.active')
        const step = dot && dot.closest('.resvStepDot')
        return step && step.getAttribute('data-step-id') !== 'date'
      },
      { timeout: 30_000 },
    )
    const stepId = await page.locator('.resvStepDot:has(.resvDot.active)').getAttribute('data-step-id')
    if (stepId === 'personal') break // reached personal data
    if (stepId === 'rice' || stepId === 'groupMenu') {
      await page.locator('.resvChoice', { hasText: 'No' }).first().click()
      await page.getByRole('button', { name: 'Siguiente', exact: true }).click()
    } else if (stepId === 'mandatoryMenu') {
      const skip = page.getByRole('button', { name: 'Continuar sin reservar menú recomendado' })
      if (await skip.count()) {
        await skip.click()
      } else {
        throw new Error('mandatoryMenu step with no skip option')
      }
    } else {
      throw new Error(`unexpected step after date: ${stepId}`)
    }
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

test.afterAll(async ({ playwright }, testInfo) => {
  if (!createdIds.length) return
  // When Playwright starts the webServer itself PLAYWRIGHT_BASE_URL is unset;
  // fall back to the configured baseURL so created bookings actually get cancelled.
  const base = process.env.PLAYWRIGHT_BASE_URL || testInfo.project.use.baseURL
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
