import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

// Public confirm / cancel / rice pages, reached via booking-id links from emails.
// Routes (src/app.tsx): /confirm, /cancel, /update-rice  — all read ?id=BOOKING_ID.
// Runs against the live dev backend, so every created booking is cancelled in afterAll.

const RICE_TYPE = 'Arroz a banda.'
const created: number[] = []

// Live backend rate-limits booking creation; run serially so the tests don't
// hammer /api/bookings/front in parallel and trip the 429 guard.
test.describe.configure({ mode: 'serial' })

function isoDaysAhead(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayIso(): string {
  return isoDaysAhead(0)
}

// Booking creation is rate-limited; back off and retry on 429.
async function postWithRetry(request: APIRequestContext, url: string, opts: Parameters<APIRequestContext['post']>[1]) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await request.post(url, opts)
    if (res.status() !== 429) return res
    await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)))
  }
  return request.post(url, opts)
}

// A future date the restaurant is open on. Mon/Tue/Wed are closed by default;
// pick the first non-closed day >= 5 days out that has free seats.
async function pickOpenFutureDate(request: APIRequestContext): Promise<{ iso: string; time: string }> {
  for (let ahead = 5; ahead <= 40; ahead++) {
    const iso = isoDaysAhead(ahead)
    // Mon/Tue/Wed are closed by default and disabled in the calendar; skip them
    // so the wizard can actually click the day cell.
    const dow = new Date(`${iso}T00:00:00`).getDay()
    if (dow === 1 || dow === 2 || dow === 3) continue
    const ctxRes = await request.get(`/api/reservations/day-context?date=${iso}`)
    if (!ctxRes.ok()) continue
    const ctx = await ctxRes.json()
    const hours: string[] = Array.isArray(ctx.morningHours) ? ctx.morningHours : []
    if (!ctx.activeFloors?.length || hours.length === 0) continue
    // Confirm capacity for party of 2 exists on a morning hour.
    const hourRes = await request.get(`/api/reservations/hour-data?date=${iso}`)
    if (!hourRes.ok()) continue
    const hourData = await hourRes.json()
    const slot = hours.find((h) => {
      const s = hourData.hourData?.[h]
      return s && !s.isClosed && s.status !== 'closed' && (typeof s.capacity !== 'number' || s.capacity >= 2)
    })
    if (slot) return { iso, time: slot }
  }
  throw new Error('No open future date found in the next 40 days')
}

// Create a booking straight through the API (fast, deterministic) for the tests
// that only need a booking id to exercise the confirm/cancel/rice pages.
async function apiCreateBooking(
  request: APIRequestContext,
  opts: { date: string; time: string; rice?: boolean },
): Promise<number> {
  const form: Record<string, string> = {
    website_url: '',
    form_load_time: String(Math.floor(Date.now() / 1000) - 30),
    reservation_date: opts.date,
    party_size: '2',
    reservation_time: opts.time,
    preferred_floor_number: '0',
    customer_name: 'E2E Confirm/Cancel',
    contact_email: 'e2e-agent9@example.com',
    country_code: '+34',
    contact_phone: '600111222',
    adults: '2',
    children: '0',
    menu_de_grupo_selected: '0',
    menu_de_grupo_id: '',
    principales_enabled: '0',
    principales_json: '[]',
    toggleArroz: opts.rice ? 'true' : 'false',
    high_chairs: '0',
    baby_strollers: '0',
  }
  if (opts.rice) {
    form.arroz_type = RICE_TYPE
    form.arroz_servings = '2'
  }
  const res = await postWithRetry(request, '/api/bookings/front', { multipart: form })
  expect(res.ok(), `create booking failed: ${res.status()} ${await res.text()}`).toBeTruthy()
  const data = await res.json()
  expect(data.success, `create booking not success: ${JSON.stringify(data)}`).toBeTruthy()
  expect(typeof data.booking_id).toBe('number')
  created.push(data.booking_id)
  return data.booking_id
}

// Drive the full public wizard on /reservas and return the created booking id.
async function wizardCreateBooking(page: Page, date: string, time: string): Promise<number> {
  await page.addInitScript(() => window.localStorage.setItem('villacarmen_lang', 'es'))
  await page.goto('/reservas')

  const day = Number(date.slice(-2))
  const dayBtn = page
    .locator('.resvDay:not(.other):not(.disabled)')
    .filter({ hasText: new RegExp(`^${day}$`) })
    .first()
  await expect(dayBtn).toBeVisible({ timeout: 15_000 })
  await dayBtn.click()

  // Party size popover -> option with left "2".
  await page.getByRole('button', { name: 'Número de personas' }).click()
  await page
    .locator('.resvSelectOpt', { has: page.locator('.resvSelectOpt__left', { hasText: /^2$/ }) })
    .first()
    .click()

  // openingMode 'both' -> a shift selector appears; choose Comida (morning) for the morning hour.
  const shiftBtn = page.getByRole('button', { name: 'Turno' })
  if (await shiftBtn.count()) {
    await shiftBtn.click()
    await page.locator('.resvSelectOpt', { hasText: 'Comida' }).first().click()
  }

  // Pick the first available hour slot for the chosen shift.
  const hourBtn = page.locator('.resvHourBtn').first()
  await expect(hourBtn).toBeVisible({ timeout: 15_000 })
  await hourBtn.click()
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()

  // Rice step -> No.
  await expect(page.locator('.resvChoice', { hasText: 'No' }).first()).toBeVisible()
  await page.locator('.resvChoice', { hasText: 'No' }).first().click()
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()

  // Personal step.
  await page.locator('input[autocomplete="name"]').fill('E2E Wizard Agent9')
  await page.locator('input[type="email"]').fill('e2e-agent9@example.com')
  await page.locator('input[autocomplete="tel-national"]').fill('600111222')
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()

  // Adults step (default = party size, kids 0 -> skips accessories).
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click()

  // Summary: accept both checkboxes, submit, capture booking_id from the response.
  await page.locator('.resvCheck').nth(0).click()
  await page.locator('.resvCheck').nth(1).click()
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/bookings/front') && r.request().method() === 'POST'),
    page.getByRole('button', { name: 'Completar reserva' }).click(),
  ])
  const data = await res.json()
  expect(data.success, `wizard submit not success: ${JSON.stringify(data)}`).toBeTruthy()
  expect(typeof data.booking_id).toBe('number')
  created.push(data.booking_id)
  return data.booking_id
}

test.afterAll(async ({ playwright }) => {
  const request = await playwright.request.newContext({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://preact-dev.menustudioai.com',
  })
  for (const id of created) {
    // Best-effort cleanup; same-day bookings return 409 and are left as-is.
    await request
      .post('/api/public/booking/cancel', { data: { id, cancelledBy: 'e2e' } })
      .catch(() => undefined)
  }
  await request.dispose()
})

test('create then confirm a booking', async ({ page, request }) => {
  const { iso, time } = await pickOpenFutureDate(request)
  const id = await wizardCreateBooking(page, iso, time)

  await page.goto(`/confirm?id=${id}`)
  const card = page.locator('[data-ui="confirm-reservation"]')
  await expect(card).toHaveAttribute('data-state', 'ready')
  await expect(card.locator('[data-slot="customer-name"]')).toContainText('E2E Wizard Agent9')
  await expect(card.locator('[data-slot="field-date"]')).toBeVisible()

  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/public/booking/confirm') && r.request().method() === 'POST'),
    card.locator('[data-slot="confirm-btn"]').click(),
  ])
  expect((await res.json()).success).toBeTruthy()
  await expect(page.locator('[data-ui="confirm-reservation"]')).toHaveAttribute('data-state', 'success')

  // Second visit shows the already-confirmed state.
  await page.goto(`/confirm?id=${id}`)
  const revisit = page.locator('[data-ui="confirm-reservation"]')
  await expect(revisit).toHaveAttribute('data-state', 'ready')
  await expect(revisit.locator('[data-slot="already-confirmed"]')).toBeVisible()
  await expect(revisit.locator('[data-slot="confirm-btn"]')).toHaveCount(0)
})

test('confirm already-confirmed booking shows alreadyConfirmed', async ({ page, request }) => {
  const { iso, time } = await pickOpenFutureDate(request)
  const id = await apiCreateBooking(request, { date: iso, time })

  // Pre-confirm via API, then load the page: it must show the already-confirmed state.
  const first = await request.post('/api/public/booking/confirm', { data: { id } })
  expect((await first.json()).success).toBeTruthy()

  await page.goto(`/confirm?id=${id}`)
  const card = page.locator('[data-ui="confirm-reservation"]')
  await expect(card).toHaveAttribute('data-state', 'ready')
  await expect(card.locator('[data-slot="already-confirmed"]')).toBeVisible()
  await expect(card.locator('[data-slot="confirm-btn"]')).toHaveCount(0)

  // And the API itself reports alreadyConfirmed on a repeat confirm.
  const again = await request.post('/api/public/booking/confirm', { data: { id } })
  const data = await again.json()
  expect(data.success).toBeTruthy()
  expect(data.alreadyConfirmed).toBe(true)
})

test('create then cancel a booking', async ({ page, request }) => {
  const { iso, time } = await pickOpenFutureDate(request)
  const id = await apiCreateBooking(request, { date: iso, time })

  await page.goto(`/cancel?id=${id}`)
  const card = page.locator('[data-ui="cancel-reservation"]')
  await expect(card).toHaveAttribute('data-state', 'ready')
  await expect(card.locator('[data-slot="customer-name"]')).toContainText('E2E Confirm/Cancel')

  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/public/booking/cancel') && r.request().method() === 'POST'),
    card.locator('[data-slot="cancel-btn"]').click(),
  ])
  expect((await res.json()).success).toBeTruthy()
  await expect(page.locator('[data-ui="cancel-reservation"]')).toHaveAttribute('data-state', 'success')
})

test('cancel same-day booking is blocked', async ({ page, request }) => {
  // Same-day creation only works if the restaurant is open today with capacity.
  const iso = todayIso()
  const ctxRes = await request.get(`/api/reservations/day-context?date=${iso}`)
  const ctx = ctxRes.ok() ? await ctxRes.json() : null
  const hours: string[] = ctx && Array.isArray(ctx.morningHours) ? ctx.morningHours : []
  test.skip(!ctx?.activeFloors?.length || hours.length === 0, 'Restaurant closed today; no same-day booking possible')

  const id = await apiCreateBooking(request, { date: iso, time: hours[hours.length - 1] })

  await page.goto(`/cancel?id=${id}`)
  await expect(page.locator('[data-ui="cancel-reservation"]')).toHaveAttribute('data-state', 'sameday-blocked')
  await expect(page.locator('[data-slot="call-btn"]')).toBeVisible()

  // API rejects the cancel with HTTP 409.
  const res = await request.post('/api/public/booking/cancel', { data: { id, cancelledBy: 'e2e' } })
  expect(res.status()).toBe(409)
  expect((await res.json()).success).toBe(false)
})

test('rice modification after booking', async ({ request }) => {
  const { iso, time } = await pickOpenFutureDate(request)
  const id = await apiCreateBooking(request, { date: iso, time }) // created without rice

  const before = await (await request.get(`/api/public/booking?id=${id}`)).json()
  expect(before.booking.arrozDisplay || '').not.toContain(RICE_TYPE)

  const res = await request.post('/api/public/booking/rice', { data: { id, riceType: RICE_TYPE, servings: 2 } })
  expect(res.ok()).toBeTruthy()
  expect((await res.json()).success).toBeTruthy()

  const after = await (await request.get(`/api/public/booking?id=${id}`)).json()
  expect(after.booking.arrozDisplay).toContain(RICE_TYPE)
})

test('rice modification same-day is blocked', async ({ request }) => {
  const iso = todayIso()
  const ctxRes = await request.get(`/api/reservations/day-context?date=${iso}`)
  const ctx = ctxRes.ok() ? await ctxRes.json() : null
  const hours: string[] = ctx && Array.isArray(ctx.morningHours) ? ctx.morningHours : []
  test.skip(!ctx?.activeFloors?.length || hours.length === 0, 'Restaurant closed today; no same-day booking possible')

  const id = await apiCreateBooking(request, { date: iso, time: hours[hours.length - 1] })

  const res = await request.post('/api/public/booking/rice', { data: { id, riceType: RICE_TYPE, servings: 2 } })
  expect(res.status()).toBe(409)
  expect((await res.json()).success).toBe(false)
})
