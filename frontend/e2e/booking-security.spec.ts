import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

// Live dev backend. Serial: /api/bookings/front is rate-limited 5/60s per IP,
// so parallel front-POST tests would poison each other's rate budget.
test.describe.configure({ mode: 'serial' })

// Reservas.tsx runs a 2s eased page-scroll on every step change; without this
// the wizard buttons are never "stable" for Playwright. The component skips all
// animation when reduced motion is set.
test.use({ reducedMotion: 'reduce' })

const nowSec = () => Math.floor(Date.now() / 1000)

// Multipart body matching Reservas.tsx submitBooking(). Overrides win.
function frontBody(over: Record<string, string> = {}) {
  return {
    website_url: '',
    form_load_time: String(nowSec() - 30),
    reservation_date: '2026-08-01',
    party_size: '2',
    reservation_time: '14:00',
    customer_name: 'E2E Security',
    contact_email: 'e2e-sec@test.com',
    country_code: '+34',
    contact_phone: '600111222',
    adults: '2',
    children: '0',
    menu_de_grupo_selected: '0',
    menu_de_grupo_id: '',
    principales_enabled: '0',
    principales_json: '[]',
    toggleArroz: 'false',
    high_chairs: '0',
    baby_strollers: '0',
    ...over,
  }
}

async function cancelBooking(request: APIRequestContext, id: number) {
  await request
    .post('/api/public/booking/cancel', { data: { id, cancelledBy: 'customer' } })
    .catch(() => {})
}

// Drive the wizard to the summary step with party size 2 (→ adults 2, no kids,
// no accessories step). Handles the conditional group/rice/personal steps.
async function gotoSummary(page: Page) {
  await page.goto('/reservas')

  const day = page.locator('.resvDay:not(.disabled):not(.other)').first()
  await day.waitFor({ state: 'visible', timeout: 15_000 })
  await day.click()

  const peopleBtn = page.getByRole('button', { name: /Número de personas|Number of guests/ })
  await expect(peopleBtn).toBeEnabled({ timeout: 15_000 })
  await peopleBtn.click()
  await page.locator('.resvSelectOpt', { has: page.locator('.resvSelectOpt__left', { hasText: /^2$/ }) }).first().click()

  // Optional floor selector (>1 active floor).
  const floorBtn = page.getByRole('button', { name: /^(Salón|Dining room)$/ })
  if (await floorBtn.count()) {
    await floorBtn.first().click()
    await page.locator('.resvSelectOpt').first().click()
  }
  // Optional shift selector (openingMode 'both') — must pick before hours show.
  const shiftBtn = page.getByRole('button', { name: /^(Turno|Service)$/ })
  if (await shiftBtn.count()) {
    await shiftBtn.first().click()
    await page.locator('.resvSelectOpt').first().click()
  }

  const hour = page.locator('.resvHourBtn').first()
  await hour.waitFor({ state: 'visible', timeout: 15_000 })
  await hour.click()

  await page.locator('.resvActions .btn.primary').first().click()

  // Walk remaining steps until the terms block appears.
  const terms = page.locator('.resvTerms')
  for (let i = 0; i < 8; i++) {
    if (await terms.count()) break
    await page.waitForTimeout(500) // let the motion step-mount settle
    const title = (await page.locator('.resvCardTitle').first().textContent())?.trim() || ''

    if (/Selección de arroz|Rice selection/.test(title)) {
      const no = page.locator('.resvChoice', { hasText: /^No$/ })
      await no.click()
      await expect(no).toHaveClass(/selected/)
    } else if (/Menú de grupos|Group menu/.test(title)) {
      const no = page.locator('.resvChoice', { hasText: /^No$/ })
      await no.click()
      await expect(no).toHaveClass(/selected/)
    } else if (/Menú recomendado|Recommended menu/.test(title)) {
      const skip = page.getByRole('button', { name: /Continuar sin|Continue without/ })
      if (await skip.count()) await skip.click()
      else await page.locator('.resvSelectOpt').first().click()
    } else if (/Datos personales|Personal details/.test(title)) {
      await page.locator('input[type="text"]').first().fill('E2E Security')
      await page.locator('input[type="email"]').first().fill('e2e-sec@test.com')
      await page.locator('input[type="tel"]').first().fill('600111222')
    }

    // Primary "Next" only renders once the step is valid; wait for it, then advance.
    const next = page.locator('.resvActions .btn.primary')
    await expect(next).toBeVisible({ timeout: 10_000 })
    await next.click({ force: true })
    await page.waitForTimeout(500)
  }

  await expect(terms).toBeVisible({ timeout: 10_000 })
}

const termsCheckbox = (page: Page) => page.locator('.resvCheck').nth(0).getByRole('checkbox')
const privacyCheckbox = (page: Page) => page.locator('.resvCheck').nth(1).getByRole('checkbox')
const submitBtn = (page: Page) => page.getByRole('button', { name: /Completar reserva|Complete reservation/ })
const fallback = (page: Page) => page.locator('.resvActionFallback')

test('terms checkbox must be accepted to submit', async ({ page }) => {
  await gotoSummary(page)
  // AND-gated: check privacy only → still blocked; then terms → submit appears.
  await privacyCheckbox(page).click()
  await expect(submitBtn(page)).toHaveCount(0)
  await expect(fallback(page)).toBeVisible()

  await termsCheckbox(page).click()
  await expect(submitBtn(page)).toBeVisible()
})

test('privacy checkbox must be accepted to submit', async ({ page }) => {
  await gotoSummary(page)
  await termsCheckbox(page).click()
  await expect(submitBtn(page)).toHaveCount(0)
  await expect(fallback(page)).toBeVisible()

  await privacyCheckbox(page).click()
  await expect(submitBtn(page)).toBeVisible()
})

test('both terms AND privacy required', async ({ page }) => {
  await gotoSummary(page)
  await termsCheckbox(page).click()
  await expect(submitBtn(page)).toHaveCount(0) // only terms → blocked

  await termsCheckbox(page).click() // uncheck
  await privacyCheckbox(page).click()
  await expect(submitBtn(page)).toHaveCount(0) // only privacy → blocked

  await termsCheckbox(page).click() // both now
  await expect(submitBtn(page)).toBeVisible()
})

test('honeypot field rejects submission', async ({ request }) => {
  const res = await request.post('/api/bookings/front', {
    multipart: frontBody({ website_url: 'spam' }),
  })
  expect(res.status()).toBe(403)
})

test('fast form submission is rejected', async ({ request }) => {
  const res = await request.post('/api/bookings/front', {
    multipart: frontBody({ form_load_time: String(nowSec() - 2) }),
  })
  expect(res.status()).toBe(403)
})

test('rate limiting blocks after 5 submissions', async ({ request }) => {
  const created: number[] = []
  const statuses: number[] = []
  // Distinct data per call. >5 within 60s must trip 429.
  for (let i = 0; i < 6; i++) {
    const res = await request.post('/api/bookings/front', {
      multipart: frontBody({
        customer_name: `RL Test ${i}`,
        contact_email: `rl-test-${i}-${nowSec()}@test.com`,
      }),
    })
    statuses.push(res.status())
    const body = await res.json().catch(() => null)
    if (body?.booking_id) created.push(body.booking_id)
  }
  // Cleanup real bookings first, regardless of assertion outcome.
  for (const id of created) await cancelBooking(request, id)

  expect(statuses).toContain(429)
})

test('valid form_load_time is accepted', async ({ request }) => {
  const res = await request.post('/api/bookings/front', {
    multipart: frontBody({
      form_load_time: String(nowSec() - 30),
      contact_email: `valid-timing-${nowSec()}@test.com`,
    }),
  })
  // Not rejected for timing. May be 200 (booking) or 429 (rate budget spent by
  // the prior test), but never a timing 403.
  expect(res.status()).not.toBe(403)
  const body = await res.json().catch(() => null)
  if (body?.booking_id) await cancelBooking(request, body.booking_id)
})

test('admin token required for admin booking insert', async ({ request }) => {
  const res = await request.post('/api/insert_booking.php', {
    data: frontBody(),
    headers: { 'Content-Type': 'application/json' },
  })
  // Must not accept an unauthenticated admin insert.
  expect(res.ok()).toBeFalsy()
  expect(res.status()).toBeGreaterThanOrEqual(400)
})
