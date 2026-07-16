import { expect, test, type Page } from '@playwright/test'

// Reaches the personal step via date+party+time, skipping any group menu and rice ("No").
async function reachPersonal(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem('villacarmen_lang', 'es'))
  await page.goto('/reservas')

  const day = page.locator('.resvDay:not(.disabled):not(.other)').first()
  await day.waitFor({ state: 'visible', timeout: 20_000 })
  await day.click()

  // Party size 2.
  const party = page.getByRole('button', { name: 'Número de personas' })
  await expect(party).toBeEnabled({ timeout: 20_000 })
  await party.click()
  await page
    .locator('.resvSelectOpt')
    .filter({ has: page.locator('.resvSelectOpt__left', { hasText: /^2$/ }) })
    .first()
    .click()

  // Shift (only if openingMode === 'both').
  const shift = page.getByRole('button', { name: 'Turno' })
  if (await shift.isVisible().catch(() => false)) {
    await shift.click()
    await page.getByRole('option', { name: 'Comida' }).click()
  }

  // Floor (only if >1 active floor).
  const floor = page.getByRole('button', { name: 'Salón' })
  if (await floor.isVisible().catch(() => false)) {
    await floor.click()
    await page.locator('.resvSelectOpt').first().click()
  }

  // First available time slot.
  const hour = page.locator('.resvHourBtn').first()
  await hour.waitFor({ state: 'visible', timeout: 20_000 })
  await hour.click()

  // Next out of date step (primary button inside the step card).
  const stepNext = page.locator('.resvStep button.primary', { hasText: 'Siguiente' })
  await stepNext.first().click()

  // Walk group menu / rice (answer "No") until the personal name input shows up.
  const nameInput = page.locator('input[autocomplete="name"]')
  for (let i = 0; i < 4; i++) {
    if (await nameInput.isVisible().catch(() => false)) break
    const no = page.getByRole('button', { name: 'No', exact: true }).first()
    await no.waitFor({ state: 'visible', timeout: 20_000 })
    await no.click()
    await stepNext.first().click()
  }
  await expect(nameInput).toBeVisible({ timeout: 20_000 })
}

function fields(page: Page) {
  return {
    name: page.locator('input[autocomplete="name"]'),
    email: page.locator('input[type="email"]'),
    phone: page.locator('input[type="tel"]'),
    prefix: page.getByRole('button', { name: 'Prefijo' }),
    next: page.locator('.resvStep button.primary', { hasText: 'Siguiente' }),
  }
}

// personalStepReady gates the "Siguiente" button: absent = blocked, present = allowed.
async function fill(page: Page, opts: { name?: string; email?: string; phone?: string }) {
  const f = fields(page)
  if (opts.name != null) await f.name.fill(opts.name)
  if (opts.email != null) await f.email.fill(opts.email)
  if (opts.phone != null) await f.phone.fill(opts.phone)
}

const VALID = { name: 'Test User', email: 'test@example.com', phone: '666666666' }

test('empty name blocks progression', async ({ page }) => {
  await reachPersonal(page)
  await fill(page, { name: '', email: VALID.email, phone: VALID.phone })
  await expect(fields(page).next).toHaveCount(0)
})

test('valid name allows progression', async ({ page }) => {
  await reachPersonal(page)
  await fill(page, VALID)
  await expect(fields(page).name).toHaveValue('Test User')
  await expect(fields(page).next).toBeVisible()
})

test('invalid email blocks progression', async ({ page }) => {
  await reachPersonal(page)
  await fill(page, { name: VALID.name, phone: VALID.phone, email: 'notanemail' })
  await expect(fields(page).next).toHaveCount(0)
  // Needs a TLD after '@' + dot.
  await fill(page, { email: 'missing@domain' })
  await expect(fields(page).next).toHaveCount(0)
})

test('valid email allows progression', async ({ page }) => {
  await reachPersonal(page)
  await fill(page, VALID)
  await expect(fields(page).next).toBeVisible()
})

test('phone too short blocks progression', async ({ page }) => {
  await reachPersonal(page)
  // 3 national digits < 6 minimum.
  await fill(page, { name: VALID.name, email: VALID.email, phone: '123' })
  await expect(fields(page).next).toHaveCount(0)
})

test('phone valid allows progression', async ({ page }) => {
  await reachPersonal(page)
  await fill(page, { name: VALID.name, email: VALID.email, phone: '666666666' })
  await expect(fields(page).next).toBeVisible()
})

test('phone too long blocks progression (E.164 limit)', async ({ page }) => {
  await reachPersonal(page)
  // cc 34 (2) + 14 national = 16 > 15 E.164 max.
  await fill(page, { name: VALID.name, email: VALID.email, phone: '12345678901234' })
  await expect(fields(page).next).toHaveCount(0)
})

test('country code selector defaults to 34', async ({ page }) => {
  await reachPersonal(page)
  await expect(fields(page).prefix).toContainText('34')
})

test('country code can be changed', async ({ page }) => {
  await reachPersonal(page)
  await fields(page).prefix.click()
  await page.getByRole('option', { name: 'Estados Unidos' }).click()
  await expect(fields(page).prefix).toContainText('+1')
})

test('double prefix reaches backend and is normalized', async ({ page }) => {
  await reachPersonal(page)
  // Phone starting with the country code: passes client validation (13 digits total <= 15).
  await fill(page, { name: 'Doble Prefijo', email: 'doble@example.com', phone: '34666666666' })
  await expect(fields(page).next).toBeVisible()

  const submitted = new Promise<Record<string, string>>((resolve) => {
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/bookings/front')) {
        const data = req.postData() || ''
        const out: Record<string, string> = {}
        for (const key of ['country_code', 'contact_phone']) {
          const m = new RegExp(`name="${key}"\\r?\\n\\r?\\n([^\\r\\n-]*)`).exec(data)
          if (m) out[key] = m[1]
        }
        resolve(out)
      }
    })
  })

  await fields(page).next.click()
  // adults -> summary
  await page.locator('.resvStep button.primary', { hasText: 'Siguiente' }).click()
  await page.locator('.resvCheck').nth(0).locator('button, input').first().click()
  await page.locator('.resvCheck').nth(1).locator('button, input').first().click()
  await page.getByRole('button', { name: 'Completar reserva' }).click()

  const payload = await submitted
  // Client sends country_code="+34" and the raw (double-prefixed) national number;
  // backend is responsible for stripping the duplicated 34 prefix.
  expect(payload.country_code).toBe('+34')
  expect(payload.contact_phone).toBe('34666666666')
})
